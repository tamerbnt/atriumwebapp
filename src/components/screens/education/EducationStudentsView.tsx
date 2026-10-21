import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Shield,
  GraduationCap,
  Calendar,
  DollarSign,
  Award,
  X,
  Trash2,
  Edit2,
  CheckCircle2,
  FileCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { EduStudent, StudentStatus } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { CertificateModal } from './CertificateModal';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { useTranslation } from '../../../utils/useTranslation';

type FilterKey = 'all' | 'active' | 'minors' | 'overdue' | 'graduated';

export const EducationStudentsView: React.FC = () => {
  const { t, isRtl } = useTranslation();
  const {
    terminology,
    eduStudents,
    eduCohorts,
    eduEnrollments,
    eduAttendance,
    eduGrades,
    eduCertificates,
    addEduStudent,
    updateEduStudent,
    deleteEduStudent,
    addEduEnrollment,
    setScreen,
  } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterKey, setFilterKey] = useState<FilterKey>('all');
  const [selectedStudent, setSelectedStudent] = useState<EduStudent | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<
    'academic' | 'financial' | 'guardian' | 'certificates'
  >('academic');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<EduStudent | null>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [selectedCertForPreview, setSelectedCertForPreview] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    fullName: string;
    email: string;
    phone: string;
    isMinor: boolean;
    guardianName: string;
    guardianPhone: string;
    guardianRelation: string;
    schoolGrade: string;
    status: StudentStatus;
    notes: string;
    initialCohortId: string;
  }>({
    fullName: '',
    email: '',
    phone: '',
    isMinor: false,
    guardianName: '',
    guardianPhone: '',
    guardianRelation: 'Father',
    schoolGrade: '',
    status: 'Active',
    notes: '',
    initialCohortId: eduCohorts[0]?.id || '',
  });

  // Filter students
  const filteredStudents = useMemo(() => {
    return eduStudents.filter((st) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          st.fullName.toLowerCase().includes(q) ||
          (st.phone && st.phone.toLowerCase().includes(q)) ||
          (st.email && st.email.toLowerCase().includes(q)) ||
          (st.guardianName && st.guardianName.toLowerCase().includes(q));
        if (!match) return false;
      }

      // Filter tabs
      if (filterKey === 'active' && st.status !== 'Active') return false;
      if (filterKey === 'minors' && !st.guardianName) return false;
      if (filterKey === 'graduated' && st.status !== 'Graduated') return false;
      if (filterKey === 'overdue') {
        const enroll = eduEnrollments.find((e) => e.studentId === st.id);
        if (!enroll || enroll.paymentStatus !== 'Overdue') return false;
      }

      return true;
    });
  }, [eduStudents, searchQuery, filterKey, eduEnrollments]);

  // Aggregated KPIs
  const totalStudentsCount = eduStudents.length;
  const activeMinorsCount = eduStudents.filter((s) => Boolean(s.guardianName)).length;
  const totalBilledEquiv = eduEnrollments
    .filter((e) => e.paymentStatus === 'Paid' || e.paidAmount > 0)
    .reduce((sum, e) => sum + (e.paidAmount || 0), 0);
  const averageAttendance =
    eduStudents.length > 0
      ? Math.round(
          eduStudents.reduce((acc, s) => acc + (s.attendanceRatePercent || 92), 0) /
            eduStudents.length
        )
      : 95;

  const handleOpenAdd = () => {
    setStudentToEdit(null);
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      isMinor: false,
      guardianName: '',
      guardianPhone: '',
      guardianRelation: 'Father',
      schoolGrade: 'Adult Learner',
      status: 'Active',
      notes: '',
      initialCohortId: eduCohorts[0]?.id || '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (student: EduStudent) => {
    setStudentToEdit(student);
    setFormData({
      fullName: student.fullName,
      email: student.email || '',
      phone: student.phone,
      isMinor: Boolean(student.guardianName),
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      guardianRelation: student.guardianRelation || 'Father',
      schoolGrade: student.schoolGrade || '',
      status: student.status,
      notes: student.notes || '',
      initialCohortId: '',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentToEdit) {
      updateEduStudent(studentToEdit.id, {
        fullName: formData.fullName,
        email: formData.email || undefined,
        phone: formData.phone,
        guardianName: formData.isMinor ? formData.guardianName : undefined,
        guardianPhone: formData.isMinor ? formData.guardianPhone : undefined,
        guardianRelation: formData.isMinor ? formData.guardianRelation : undefined,
        schoolGrade: formData.schoolGrade || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
      });
      if (selectedStudent?.id === studentToEdit.id) {
        setSelectedStudent({
          ...selectedStudent,
          fullName: formData.fullName,
          email: formData.email || undefined,
          phone: formData.phone,
          guardianName: formData.isMinor ? formData.guardianName : undefined,
          guardianPhone: formData.isMinor ? formData.guardianPhone : undefined,
          guardianRelation: formData.isMinor ? formData.guardianRelation : undefined,
          schoolGrade: formData.schoolGrade || undefined,
          status: formData.status,
          notes: formData.notes || undefined,
        });
      }
    } else {
      const newStudent = addEduStudent({
        fullName: formData.fullName,
        email: formData.email || undefined,
        phone: formData.phone,
        guardianName: formData.isMinor ? formData.guardianName : undefined,
        guardianPhone: formData.isMinor ? formData.guardianPhone : undefined,
        guardianRelation: formData.isMinor ? formData.guardianRelation : undefined,
        schoolGrade: formData.schoolGrade || undefined,
        status: formData.status,
        attendanceRatePercent: 100,
        notes: formData.notes || undefined,
      });

      if (formData.initialCohortId) {
        const cohort = eduCohorts.find((c) => c.id === formData.initialCohortId);
        if (cohort) {
          addEduEnrollment({
            studentId: newStudent.id,
            studentName: newStudent.fullName,
            cohortId: cohort.id,
            cohortName: cohort.name,
            agreedTuition: cohort.tuitionFee,
            discountAmount: 0,
            paidAmount: 0,
            balanceDue: cohort.tuitionFee,
            currency: cohort.currency,
            paymentStatus: 'Pending',
            status: 'Active',
            installments: [
              {
                dueDate: cohort.startDate,
                amount: Math.round(cohort.tuitionFee * 0.5),
                isPaid: false,
              },
              {
                dueDate: cohort.endDate,
                amount: cohort.tuitionFee - Math.round(cohort.tuitionFee * 0.5),
                isPaid: false,
              },
            ],
          });
        }
      }
      setSelectedStudent(newStudent);
    }
    setIsAddModalOpen(false);
  };

  const handleDelete = (student: EduStudent) => {
    if (confirm(t('edu_confirm_delete_student', { name: student.fullName }))) {
      deleteEduStudent(student.id);
      if (selectedStudent?.id === student.id) {
        setSelectedStudent(null);
      }
    }
  };

  // Helper for drawer data
  const studentEnrollments = selectedStudent
    ? eduEnrollments.filter((e) => e.studentId === selectedStudent.id)
    : [];
  const studentAttendance = selectedStudent
    ? eduAttendance.filter((a) => a.studentId === selectedStudent.id)
    : [];
  const studentGrades = selectedStudent
    ? eduGrades.filter((g) => g.studentId === selectedStudent.id)
    : [];
  const studentCerts = selectedStudent
    ? eduCertificates.filter((c) => c.studentId === selectedStudent.id)
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header matching other category screens */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {t('edu_students_title')}
            </h1>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {totalStudentsCount} accounts · {activeMinorsCount} linked guardians
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {t('edu_students_subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="h-10 px-4 rounded-xl bg-[#C4785A] text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>{t('edu_modal_add_student')}</span>
        </button>
      </div>

      {/* KPI Overview Strip matching FreelanceClientsView */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            {t('edu_kpi_total_students')}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              {totalStudentsCount}
            </span>
            <span className="text-xs text-neutral-500">
              {activeMinorsCount} minors with guardian links
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            {t('edu_kpi_attendance_rate')}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              {averageAttendance}%
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              {t('edu_verified_rate')}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            {t('edu_fin_collected')}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#C4785A] tabular-nums">
              {formatMoney(totalBilledEquiv)}
            </span>
            <span className="text-xs text-neutral-500">
              collected this academic term
            </span>
          </div>
        </div>
      </div>

      {/* Search & Segmented Filter Bar matching other screens */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Seek Kinetic Search Box */}
        <Seek
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('edu_search_students_ph')}
          shutSize={36}
          openWidth={280}
        />

        {/* Segmented Filter Control */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl self-start sm:self-auto overflow-x-auto">
          {[
            { id: 'all', label: t('edu_filter_all'), count: eduStudents.length },
            { id: 'active', label: t('edu_status_active'), count: eduStudents.filter((s) => s.status === 'Active').length },
            { id: 'minors', label: t('edu_filter_minors') },
            { id: 'overdue', label: t('edu_tuition_overdue') },
            { id: 'graduated', label: t('edu_status_graduated') },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterKey(tab.id as FilterKey)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filterKey === tab.id
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="opacity-70 ml-1.5 text-[11px]">({tab.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table View */}
      {filteredStudents.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-[#F8F9FA]/50 dark:bg-neutral-900/20">
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            {t('edu_no_students_enrolled')}
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-4 px-4 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>{t('edu_modal_add_student')}</span>
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-2xs">
          <table className="w-full text-left rtl:text-right border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">{t('edu_col_student')}</th>
                <th className="py-3.5 px-4">{t('edu_col_cohort')}</th>
                <th className="py-3.5 px-4">{t('edu_col_attendance')}</th>
                <th className="py-3.5 px-4">{t('edu_col_tuition_status')}</th>
                <th className="py-3.5 px-4">{t('edu_drawer_guardian')}</th>
                <th className="py-3.5 px-4 text-right rtl:text-left">{t('edu_col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
              {filteredStudents.map((student) => {
                const enrollment = eduEnrollments.find(
                  (e) => e.studentId === student.id && e.status === 'Active'
                );
                const isSelected = selectedStudent?.id === student.id;

                return (
                  <tr
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`transition-colors cursor-pointer group ${
                      isSelected
                        ? 'bg-[#FCEEE8]/50 dark:bg-neutral-800/60'
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-xs shrink-0 border border-neutral-200 dark:border-neutral-700">
                          {student.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-neutral-900 dark:text-white group-hover:text-[#C4785A] transition-colors">
                            {student.fullName}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            {student.phone} {student.email && `· ${student.email}`}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {enrollment ? (
                        <div>
                          <span className="font-medium text-neutral-800 dark:text-neutral-200 block truncate max-w-[180px]">
                            {enrollment.cohortName}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            Enrolled {enrollment.enrolledAt ? enrollment.enrolledAt.split('T')[0] : 'Active'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic">No Active Cohort</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              (student.attendanceRatePercent ?? 100) >= 85
                                ? 'bg-emerald-500'
                                : 'bg-rose-500'
                            }`}
                            style={{
                              width: `${student.attendanceRatePercent ?? 100}%`,
                            }}
                          />
                        </div>
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300 tabular-nums">
                          {student.attendanceRatePercent ?? 100}%
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {enrollment ? (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase ${
                            enrollment.paymentStatus === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : enrollment.paymentStatus === 'Overdue'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}
                        >
                          {enrollment.paymentStatus} · {formatMoney(enrollment.paidAmount)}
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {student.guardianName ? (
                        <div className="text-neutral-700 dark:text-neutral-300">
                          <span className="font-medium">{student.guardianName}</span>
                          <span className="text-[10px] text-neutral-400 block">
                            {student.guardianRelation || 'Guardian'} · {student.guardianPhone}
                          </span>
                        </div>
                      ) : (
                        <span className="text-neutral-400">Adult / Self</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right rtl:text-left">
                      <div className="flex items-center justify-end rtl:justify-start gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudent(student);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-[#C4785A] hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Profile 360°</span>
                          <ChevronRight size={13} className="rtl:rotate-180" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(student);
                          }}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          title="Edit student"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(student);
                          }}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete student"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 360° Student Slide-over Drawer matching FreelanceClientsView */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-[#18181B] h-full shadow-2xl border-l rtl:border-r rtl:border-l-0 border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-sm shrink-0 border border-neutral-200 dark:border-neutral-700">
                  {selectedStudent.fullName.charAt(0)}
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-[#C4785A] uppercase tracking-wider block">
                    Student 360° Profile
                  </span>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                    {selectedStudent.fullName}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {selectedStudent.schoolGrade || 'Adult Learner'} · Status: {selectedStudent.status}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedStudent)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  title="Edit Profile"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Segmented Navigation in Drawer */}
            <div className="px-5 pt-3 pb-2 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/30">
              <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl overflow-x-auto">
                {[
                  { id: 'academic', label: t('edu_drawer_academic') },
                  { id: 'financial', label: t('edu_drawer_financial') },
                  { id: 'guardian', label: t('edu_drawer_guardian') },
                  { id: 'certificates', label: t('edu_drawer_certificates') },
                ].map((tb) => (
                  <button
                    key={tb.id}
                    onClick={() => setActiveDrawerTab(tb.id as any)}
                    className={`flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg text-center transition-colors whitespace-nowrap cursor-pointer ${
                      activeDrawerTab === tb.id
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {tb.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {activeDrawerTab === 'academic' && (
                <div className="space-y-4">
                  {/* Current Active Cohorts */}
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider mb-2">
                      {t('edu_cohorts_title')}
                    </h3>
                    {studentEnrollments.length === 0 ? (
                      <p className="text-neutral-400 italic">No current enrollments.</p>
                    ) : (
                      <div className="space-y-2">
                        {studentEnrollments.map((enr) => (
                          <div
                            key={enr.id}
                            className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-900/60"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-neutral-900 dark:text-white">
                                {enr.cohortName}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                {enr.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-500">
                              Agreed Tuition: {formatMoney(enr.agreedTuition)} · Paid:{' '}
                              {formatMoney(enr.paidAmount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Attendance Log */}
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider mb-2">
                      {t('edu_tab_rollcall')}
                    </h3>
                    {studentAttendance.length === 0 ? (
                      <p className="text-neutral-400 italic">{t('edu_no_sessions')}</p>
                    ) : (
                      <div className="space-y-1.5">
                        {studentAttendance.slice(0, 5).map((att) => (
                          <div
                            key={att.id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                          >
                            <span className="text-neutral-700 dark:text-neutral-300">
                              {att.recordedAt ? att.recordedAt.split('T')[0] : 'Recent Session'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                                att.status === 'Present'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : att.status === 'Late'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                              }`}
                            >
                              {att.status} {att.minutesLate ? `(+${att.minutesLate}m)` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Academic Grades */}
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider mb-2">
                      {t('edu_tab_gradebook')}
                    </h3>
                    {studentGrades.length === 0 ? (
                      <p className="text-neutral-400 italic">No grades recorded yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {studentGrades.map((g) => (
                          <div
                            key={g.id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                          >
                            <div>
                              <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                                {g.assessmentTitle}
                              </div>
                              {g.teacherRemarks && (
                                <div className="text-[10px] text-neutral-400">
                                  "{g.teacherRemarks}"
                                </div>
                              )}
                            </div>
                            <span className="font-bold text-[#C4785A] tabular-nums">
                              {g.score} / {g.maxScore}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeDrawerTab === 'financial' && (
                <div className="space-y-4">
                  {studentEnrollments.map((enr) => (
                    <div
                      key={enr.id}
                      className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-900/60 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-900 dark:text-white">
                          {enr.cohortName}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          {enr.paymentStatus}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                          <span className="text-neutral-400 block text-[10px]">{t('edu_field_tuition_fee')}</span>
                          <span className="font-bold text-neutral-900 dark:text-white">
                            {formatMoney(enr.agreedTuition)}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                          <span className="text-neutral-400 block text-[10px]">{t('edu_fin_receivables')}</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            {formatMoney(enr.balanceDue)}
                          </span>
                        </div>
                      </div>

                      {/* Installment breakdown */}
                      <div className="space-y-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-800">
                        <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 block">
                          Installment Milestones
                        </span>
                        {enr.installments?.map((inst, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-neutral-900 text-xs"
                          >
                            <span>
                              Installment #{idx + 1} (Due: {inst.dueDate})
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold tabular-nums">
                                {formatMoney(inst.amount)}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  inst.isPaid
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-neutral-100 text-neutral-500'
                                }`}
                              >
                                {inst.isPaid ? t('edu_tuition_paid') : t('edu_tuition_unpaid')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudent(null);
                          setScreen('finance');
                        }}
                        className="w-full py-2 text-xs font-semibold text-center text-[#C4785A] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 rounded-xl transition-colors cursor-pointer shadow-2xs"
                      >
                        {t('edu_btn_log_payment')} →
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeDrawerTab === 'guardian' && (
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {t('edu_drawer_guardian')}
                    </span>
                    <Shield size={16} className="text-[#C4785A]" />
                  </div>

                  {selectedStudent.guardianName ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">{t('edu_field_guardian_name')}:</span>
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          {selectedStudent.guardianName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">{t('edu_field_guardian_relation')}:</span>
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          {selectedStudent.guardianRelation || 'Parent'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">{t('edu_field_guardian_phone')}:</span>
                        <a
                          href={`tel:${selectedStudent.guardianPhone}`}
                          className="font-semibold text-[#C4785A] hover:underline"
                        >
                          {selectedStudent.guardianPhone}
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-neutral-400 italic">
                      No linked guardian recorded. Student is registered as an independent adult.
                    </p>
                  )}
                </div>
              )}

              {activeDrawerTab === 'certificates' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {t('edu_drawer_certificates')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCertModalOpen(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#C4785A] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer hover:opacity-90"
                    >
                      <Plus size={12} />
                      <span>{t('edu_btn_issue_certificate')}</span>
                    </button>
                  </div>

                  {studentCerts.length === 0 ? (
                    <div className="p-8 text-center rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
                      <Award size={32} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
                      <p className="text-neutral-400 italic">No certificates issued yet.</p>
                      <p className="text-[11px] text-neutral-500 mt-1">
                        {t('edu_cert_security_sub')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {studentCerts.map((c) => (
                        <div
                          key={c.id}
                          className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-900/60 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-neutral-900 dark:text-white">
                              {c.courseTitle}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700">
                              Verified
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-500">
                            Issued: {c.issueDate} · Honors: {c.honors || 'Certificate of Completion'}
                          </div>
                          <div className="text-[10px] font-mono text-neutral-400 truncate">
                            Hash: {c.verificationHash || '0x4f8e...ba39'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {studentToEdit ? t('edu_modal_edit_student') : t('edu_modal_add_student')}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4 pt-4 text-xs">
              <LabelInput
                id="student-fullname"
                label={t('edu_field_fullname')}
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Amine Mansouri"
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  id="student-phone"
                  label={t('edu_field_phone')}
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0550 12 34 56"
                />
                <LabelInput
                  id="student-email"
                  label={t('edu_field_email')}
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="amine@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  id="student-grade"
                  label={t('edu_field_school_grade')}
                  value={formData.schoolGrade}
                  onChange={(e) => setFormData({ ...formData, schoolGrade: e.target.value })}
                  placeholder="e.g. 3AS Math / Adult"
                />
                <LabelSelect
                  label={t('edu_filter_status')}
                  value={formData.status}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      status: (val?.target?.value ?? String(val)) as any,
                    })
                  }
                  options={[
                    { value: 'Active', label: t('edu_status_active') },
                    { value: 'Applicant', label: t('edu_stage_inquiry') },
                    { value: 'Graduated', label: t('edu_status_graduated') },
                    { value: 'Suspended', label: t('edu_status_paused') },
                  ]}
                />
              </div>

              {!studentToEdit && eduCohorts.length > 0 && (
                <LabelSelect
                  label={t('edu_field_initial_cohort')}
                  value={formData.initialCohortId}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      initialCohortId: val?.target?.value ?? String(val),
                    })
                  }
                  options={[
                    { value: '', label: 'No immediate cohort assignment' },
                    ...eduCohorts.map((c) => ({
                      value: c.id,
                      label: `${c.name} (${c.cohortCode || c.courseTitle})`,
                    })),
                  ]}
                  placeholder="Select Cohort..."
                />
              )}

              {/* Guardian checkbox & inputs */}
              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-900/60 space-y-3">
                <label className="flex items-center gap-2 font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isMinor}
                    onChange={(e) => setFormData({ ...formData, isMinor: e.target.checked })}
                    className="rounded text-[#C4785A] focus:ring-[#C4785A]"
                  />
                  <span>{t('edu_field_is_minor')}</span>
                </label>

                {formData.isMinor && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <LabelInput
                        id="guardian-name"
                        label={t('edu_field_guardian_name')}
                        value={formData.guardianName}
                        onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                        placeholder="e.g. Karim Mansouri"
                      />
                      <LabelSelect
                        label={t('edu_field_guardian_relation')}
                        value={formData.guardianRelation}
                        onChange={(val) =>
                          setFormData({
                            ...formData,
                            guardianRelation: val?.target?.value ?? String(val),
                          })
                        }
                        options={[
                          { value: 'Father', label: 'Father' },
                          { value: 'Mother', label: 'Mother' },
                          { value: 'Guardian', label: 'Guardian' },
                          { value: 'Sibling', label: 'Sibling' },
                        ]}
                      />
                    </div>
                    <LabelInput
                      id="guardian-phone"
                      label={t('edu_field_guardian_phone')}
                      type="tel"
                      value={formData.guardianPhone}
                      onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                      placeholder="0661 98 76 54"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold cursor-pointer"
                >
                  {t('common_cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  {t('edu_btn_save_student')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {isCertModalOpen && (
        <CertificateModal
          certificate={selectedCertForPreview}
          onClose={() => {
            setIsCertModalOpen(false);
            setSelectedCertForPreview(null);
          }}
        />
      )}
    </div>
  );
};

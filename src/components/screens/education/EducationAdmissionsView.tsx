import React, { useState } from 'react';
import {
  ClipboardList,
  Plus,
  Phone,
  Mail,
  UserCheck,
  ArrowRight,
  X,
  ChevronRight,
  GraduationCap,
  Sparkles,
  Search,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { AdmissionStage, EduAdmissionLead } from '../../../types';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { useTranslation } from '../../../utils/useTranslation';

export const EducationAdmissionsView: React.FC = () => {
  const { t, isRtl } = useTranslation();
  const {
    eduAdmissions,
    eduCourses,
    eduCohorts,
    addEduAdmissionLead,
    updateAdmissionStage,
    convertAdmissionToStudent,
  } = useAtriumStore();

  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [conversionLead, setConversionLead] = useState<EduAdmissionLead | null>(null);
  const [targetCohortId, setTargetCohortId] = useState<string>(eduCohorts[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    studentName: '',
    phone: '',
    email: '',
    desiredCourseId: eduCourses[0]?.id || '',
    guardianName: '',
    placementScore: '',
    source: 'Social Media',
    notes: '',
  });

  const stages: { id: AdmissionStage; title: string }[] = [
    { id: 'Inquiry', title: t('edu_stage_inquiry') },
    { id: 'PlacementTest', title: t('edu_stage_placement') },
    { id: 'TrialClass', title: t('edu_stage_trial') },
    { id: 'Admitted', title: t('edu_stage_admitted') },
    { id: 'Enrolled', title: t('edu_stage_enrolled') },
  ];

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    const course = eduCourses.find((c) => c.id === formData.desiredCourseId);
    if (!course) return;

    addEduAdmissionLead({
      studentName: formData.studentName,
      phone: formData.phone,
      email: formData.email || undefined,
      desiredCourseId: course.id,
      desiredCourseTitle: course.title,
      stage: 'Inquiry',
      guardianName: formData.guardianName || undefined,
      placementScore: formData.placementScore || undefined,
      source: formData.source,
      notes: formData.notes || undefined,
    });

    setIsAddLeadModalOpen(false);
  };

  const handleConfirmConversion = () => {
    if (!conversionLead || !targetCohortId) return;
    convertAdmissionToStudent(conversionLead.id, targetCohortId);
    setConversionLead(null);
  };

  const filteredAdmissions = eduAdmissions.filter((lead) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      lead.studentName.toLowerCase().includes(q) ||
      lead.phone.toLowerCase().includes(q) ||
      (lead.email && lead.email.toLowerCase().includes(q)) ||
      lead.desiredCourseTitle.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Row matching other category screens */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {t('edu_admissions_title')}
            </h1>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {eduAdmissions.length} active leads · 5 intake pipeline stages
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {t('edu_admissions_subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddLeadModalOpen(true)}
          className="h-10 px-4 rounded-xl bg-[#C4785A] text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
        >
          <Plus size={14} />
          <span>{t('edu_btn_new_lead')}</span>
        </button>
      </div>

      {/* Search Bar */}
      <Seek
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search leads by student, phone, desired course..."
        openWidth={320}
        shutSize={40}
      />

      {/* Kanban Pipeline Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
        {stages.map((stage) => {
          const leadsInStage = filteredAdmissions.filter((l) => l.stage === stage.id);

          return (
            <div
              key={stage.id}
              className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-900/40 p-3.5 flex flex-col space-y-3 min-h-[480px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200/80 dark:border-neutral-800">
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {stage.title}
                </span>
                <span className="w-5 h-5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 text-[10px] font-bold flex items-center justify-center">
                  {leadsInStage.length}
                </span>
              </div>

              {/* Lead Cards List */}
              <div className="space-y-2.5 flex-1">
                {leadsInStage.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs hover:border-[#C4785A]/50 transition-all space-y-2 group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-900 dark:text-white text-xs group-hover:text-[#C4785A] transition-colors">
                          {lead.studentName}
                        </span>
                        {lead.placementScore && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A]">
                            Score: {lead.placementScore}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-[#C4785A] block mt-0.5">
                        {lead.desiredCourseTitle}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        <Phone size={11} className="text-neutral-400" />
                        <span>{lead.phone}</span>
                      </div>
                      {lead.guardianName && (
                        <div className="text-[10px] text-neutral-400">
                          {t('edu_guardian_prefix', { name: lead.guardianName })}
                        </div>
                      )}
                      {lead.source && (
                        <div className="text-[10px] text-neutral-400">Source: {lead.source}</div>
                      )}
                    </div>

                    {/* Stage Transition Controls */}
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
                      {stage.id === 'Admitted' ? (
                        <button
                          type="button"
                          onClick={() => setConversionLead(lead)}
                          className="w-full py-1.5 px-2 rounded-lg bg-[#C4785A] text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 shadow-2xs"
                        >
                          <UserCheck size={12} />
                          <span>{t('edu_btn_convert_student')}</span>
                        </button>
                      ) : stage.id !== 'Enrolled' ? (
                        <button
                          type="button"
                          onClick={() => {
                            const nextIndex = stages.findIndex((s) => s.id === stage.id) + 1;
                            if (nextIndex < stages.length) {
                              updateAdmissionStage(lead.id, stages[nextIndex].id);
                            }
                          }}
                          className="w-full py-1 text-center text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Move Next</span>
                          <ArrowRight size={11} className="rtl:rotate-180" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mx-auto">
                          <UserCheck size={11} /> Converted
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {leadsInStage.length === 0 && (
                  <div className="py-8 text-center text-neutral-400 dark:text-neutral-500 text-[11px]">
                    No leads in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Convert Lead to Student Modal */}
      {conversionLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {t('edu_lead_modal_title')}
              </h2>
              <button
                type="button"
                onClick={() => setConversionLead(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="pt-4 space-y-4 text-xs">
              <p className="text-neutral-600 dark:text-neutral-300">
                You are about to register <strong className="text-neutral-900 dark:text-white">{conversionLead.studentName}</strong> into the student CRM and create an active enrollment record.
              </p>

              <LabelSelect
                label={t('edu_label_cohort')}
                value={targetCohortId}
                onChange={(val) => setTargetCohortId(val?.target?.value ?? String(val))}
                options={eduCohorts.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.cohortCode || c.courseTitle})`,
                }))}
                placeholder="Select Starting Cohort..."
              />

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setConversionLead(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold cursor-pointer"
                >
                  {t('common_cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConversion}
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  {t('edu_btn_convert_student')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {t('edu_btn_new_lead')}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddLeadModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4 pt-4 text-xs">
              <div>
                <LabelInput
                  field="studentName"
                  label={t('edu_field_fullname')}
                  required
                  placeholder="e.g. Yacine Benali"
                  value={formData.studentName}
                  onChange={(val) => setFormData({ ...formData, studentName: String(val) })}
                  width="100%"
                  height={44}
                  corner={12}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <LabelInput
                    field="phone"
                    label={t('edu_field_phone')}
                    type="tel"
                    required
                    placeholder="0550 00 00 00"
                    value={formData.phone}
                    onChange={(val) => setFormData({ ...formData, phone: String(val) })}
                    width="100%"
                    height={44}
                    corner={12}
                  />
                </div>
                <div>
                  <LabelInput
                    field="email"
                    label={t('edu_field_email')}
                    type="email"
                    placeholder="yacine@example.com"
                    value={formData.email}
                    onChange={(val) => setFormData({ ...formData, email: String(val) })}
                    width="100%"
                    height={44}
                    corner={12}
                  />
                </div>
              </div>

              <LabelSelect
                label={t('edu_field_course_title')}
                value={formData.desiredCourseId}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    desiredCourseId: val?.target?.value ?? String(val),
                  })
                }
                options={eduCourses.map((co) => ({
                  value: co.id,
                  label: `${co.title} (${co.category})`,
                }))}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <LabelInput
                    field="guardianName"
                    label={t('edu_field_guardian_name')}
                    placeholder="Parent / Sponsor"
                    value={formData.guardianName}
                    onChange={(val) => setFormData({ ...formData, guardianName: String(val) })}
                    width="100%"
                    height={44}
                    corner={12}
                  />
                </div>
                <div>
                  <LabelInput
                    field="source"
                    label={t('member_field_acquisition')}
                    placeholder="e.g. Instagram, Referral, Walk-in"
                    value={formData.source}
                    onChange={(val) => setFormData({ ...formData, source: String(val) })}
                    width="100%"
                    height={44}
                    corner={12}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddLeadModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold cursor-pointer"
                >
                  {t('common_cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  {t('edu_btn_new_lead')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

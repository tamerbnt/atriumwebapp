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

const STAGES: { id: AdmissionStage; title: string }[] = [
  { id: 'Inquiry', title: '1. Inquiries' },
  { id: 'PlacementTest', title: '2. Placement Test' },
  { id: 'TrialClass', title: '3. Trial Session' },
  { id: 'Admitted', title: '4. Admitted' },
  { id: 'Enrolled', title: '5. Enrolled' },
];

export const EducationAdmissionsView: React.FC = () => {
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
    source: 'Instagram Ad',
    notes: '',
  });

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
              Admissions & Intake Funnel
            </h1>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {eduAdmissions.length} active leads · 5 intake pipeline stages
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Prospect conversion pipeline, placement test evaluations, and automated cohort enrollment
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddLeadModalOpen(true)}
          className="h-10 px-4 rounded-xl bg-[#C4785A] text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
        >
          <Plus size={14} />
          <span>New Inquiry / Lead</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder="Search leads by student, phone, desired course..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
        />
      </div>

      {/* Kanban Pipeline Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
        {STAGES.map((stage) => {
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
                          Guardian: {lead.guardianName}
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
                          <span>Enroll Student</span>
                        </button>
                      ) : stage.id !== 'Enrolled' ? (
                        <button
                          type="button"
                          onClick={() => {
                            const nextIndex = STAGES.findIndex((s) => s.id === stage.id) + 1;
                            if (nextIndex < STAGES.length) {
                              updateAdmissionStage(lead.id, STAGES[nextIndex].id);
                            }
                          }}
                          className="w-full py-1 text-center text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Move Next</span>
                          <ArrowRight size={11} />
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
                Convert Inquiry to Active Student
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

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Select Starting Cohort Batch *
                </label>
                <select
                  value={targetCohortId}
                  onChange={(e) => setTargetCohortId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                >
                  {eduCohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.cohortCode || c.courseTitle})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setConversionLead(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConversion}
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Confirm & Enroll
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
                New Admission Inquiry / Lead
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
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Candidate Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.studentName}
                  onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  placeholder="e.g. Yacine Benali"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0550 00 00 00"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="yacine@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Desired Course *
                </label>
                <select
                  required
                  value={formData.desiredCourseId}
                  onChange={(e) => setFormData({ ...formData, desiredCourseId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                >
                  {eduCourses.map((co) => (
                    <option key={co.id} value={co.id}>
                      {co.title} ({co.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Guardian Name
                  </label>
                  <input
                    type="text"
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                    placeholder="Parent / Sponsor"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Acquisition Channel
                  </label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="e.g. Instagram, Referral, Walk-in"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddLeadModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Add Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

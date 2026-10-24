import React, { useState } from 'react';
import {
  X,
  Award,
  Printer,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { EduCertificate } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { useTranslation } from '../../../utils/useTranslation';

interface CertificateModalProps {
  certificate?: EduCertificate | null;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  certificate: existingCert,
  onClose,
}) => {
  const { t } = useTranslation();
  const {
    eduStudents,
    eduCohorts,
    eduCertificates,
    issueEduCertificate,
    currentBusiness,
  } = useAtriumStore();

  const [studentId, setStudentId] = useState<string>(
    existingCert?.studentId || eduStudents[0]?.id || ''
  );
  const [cohortId, setCohortId] = useState<string>(
    existingCert?.cohortId || eduCohorts[0]?.id || ''
  );
  const [honors, setHonors] = useState<string>(
    existingCert?.honors || 'With Distinction · Magna Cum Laude'
  );
  const [signatoryName, setSignatoryName] = useState<string>(
    existingCert?.signatoryName || 'Dr. Youcef Benali'
  );
  const [signatoryTitle, setSignatoryTitle] = useState<string>(
    existingCert?.signatoryTitle || 'Academic Dean & Program Director'
  );
  const [averageGrade, setAverageGrade] = useState<number>(
    existingCert?.averageGradeScore || 94
  );

  const [previewCert, setPreviewCert] = useState<EduCertificate | null>(
    existingCert || null
  );

  const selectedStudent = eduStudents.find((s) => s.id === studentId);
  const selectedCohort = eduCohorts.find((c) => c.id === cohortId);

  const handleIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedCohort) return;

    const cert = issueEduCertificate({
      studentId: selectedStudent.id,
      studentName: selectedStudent.fullName,
      cohortId: selectedCohort.id,
      courseTitle: selectedCohort.courseTitle,
      issueDate: new Date().toISOString().split('T')[0],
      averageGradeScore: averageGrade,
      honors,
      signatoryName,
      signatoryTitle,
    });

    setPreviewCert(cert);
  };

  const handlePrint = () => {
    window.print();
  };

  const activeCert = previewCert || existingCert;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-[#F8F9FA] dark:bg-neutral-900/60 print:hidden">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              {t(activeCert ? 'edu_cert_modal_title_view' : 'edu_cert_modal_title')}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('edu_cert_security_sub')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeCert && (
              <AtriumButton
                variant="outline"
                size="sm"
                icon={<Printer size={14} />}
                onClick={handlePrint}
              >
                <span>{t('edu_cert_print')}</span>
              </AtriumButton>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {!activeCert ? (
            /* Creation Form */
            <form onSubmit={handleIssue} className="space-y-3.5 max-w-xl mx-auto py-2">
              <div>
                <LabelSelect
                  field="RecipientStudent"
                  label={t('edu_cert_recipient')}
                  value={studentId}
                  onChange={(val) => setStudentId(val?.target?.value ?? String(val))}
                  options={eduStudents.map((s) => ({
                    value: s.id,
                    label: s.fullName,
                    sublabel: s.schoolGrade || s.phone,
                  }))}
                  searchable
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>

              <div>
                <LabelSelect
                  field="CompletedCohort"
                  label={t('edu_cert_cohort')}
                  value={cohortId}
                  onChange={(val) => setCohortId(val?.target?.value ?? String(val))}
                  options={eduCohorts.map((c) => ({
                    value: c.id,
                    label: c.name,
                    sublabel: c.courseTitle,
                  }))}
                  searchable
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  field="CumulativeGrade"
                  label={t('edu_cert_grade')}
                  type="number"
                  min={50}
                  max={100}
                  value={averageGrade}
                  onChange={(val) => setAverageGrade(parseInt(val?.target?.value ?? val) || 0)}
                  width="100%"
                  height={40}
                  corner={12}
                />
                <LabelInput
                  field="Honors"
                  label={t('edu_cert_honors')}
                  value={honors}
                  onChange={setHonors}
                  placeholder={t('edu_cert_honors_ph')}
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  field="Signatory Name"
                  label={t('edu_cert_signatory_name')}
                  value={signatoryName}
                  onChange={setSignatoryName}
                  width="100%"
                  height={40}
                  corner={12}
                />
                <LabelInput
                  field="Signatory Title"
                  label={t('edu_cert_signatory_title')}
                  value={signatoryTitle}
                  onChange={setSignatoryTitle}
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={onClose}
                >
                  {t('common_cancel')}
                </AtriumButton>
                <AtriumButton
                  variant="primary"
                  size="sm"
                  glow
                  icon={<FileCheck size={14} />}
                  type="submit"
                >
                  {t('edu_cert_generate')}
                </AtriumButton>
              </div>
            </form>
          ) : (
            /* Printable Preview */
            <div className="printable-document preserve-border max-w-2xl mx-auto p-8 rounded-2xl border-4 border-double border-[#C4785A]/40 bg-gradient-to-br from-[#FDF4F0]/40 via-white to-[#FDF4F0]/20 dark:from-neutral-900 dark:via-[#18181B] dark:to-neutral-900 shadow-xl relative overflow-hidden">
              {/* Watermark in BG */}
              <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none text-[#C4785A]">
                <GraduationCap size={240} />
              </div>

              <div className="text-center space-y-4 relative z-10">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-[#FCEEE8] text-[#C4785A] dark:bg-neutral-800 mb-1">
                  <ShieldCheck size={36} />
                </div>

                <div className="uppercase tracking-widest text-xs font-bold text-[#C4785A]">
                  {currentBusiness?.displayName || 'Atlas Academy & Tutoring Institute'}
                </div>

                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-neutral-900 dark:text-white tracking-tight">
                  {t('edu_cert_doc_title')}
                </h1>

                <p className="text-xs text-neutral-500 dark:text-neutral-400 italic">
                  {t('edu_cert_awarded_to')}
                </p>

                <div className="py-2">
                  <div className="text-2xl sm:text-3xl font-serif font-bold text-[#C4785A] border-b-2 border-[#C4785A]/30 inline-block px-8 pb-1">
                    {activeCert.studentName}
                  </div>
                </div>

                <p className="text-sm text-neutral-700 dark:text-neutral-300 max-w-lg mx-auto leading-relaxed">
                  {t('edu_cert_for_curriculum')}
                </p>

                <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {activeCert.courseTitle}
                </div>

                {activeCert.honors && (
                  <div className="inline-block text-xs font-semibold px-3 py-1 rounded-md bg-[#FCEEE8] dark:bg-neutral-800 text-[#C4785A]">
                    {activeCert.honors} · {t('edu_cert_final_score')} {activeCert.averageGradeScore}%
                  </div>
                )}

                <div className="pt-8 grid grid-cols-2 gap-8 border-t border-[#C4785A]/20 mt-8 text-left rtl:text-right">
                  <div>
                    <div className="text-xs font-semibold text-neutral-900 dark:text-white">
                      {activeCert.signatoryName}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {activeCert.signatoryTitle}
                    </div>
                    <div className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                      {t('edu_cert_date_issued')} {activeCert.issueDate}
                    </div>
                  </div>

                  <div className="text-right rtl:text-left">
                    <div className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 dark:text-neutral-500">
                      {t('edu_cert_verif_hash')}
                    </div>
                    <div className="text-xs font-mono font-medium text-[#C4785A]">
                      {activeCert.verificationHash}
                    </div>
                    <div className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                      {t('edu_cert_id')} #{activeCert.certificateNumber}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

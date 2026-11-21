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
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentEduStudentsFromState,
  selectCurrentEduCohortsFromState,
  selectCurrentEduCertificatesFromState,
  selectCurrentBusinessFromState,
  useAtriumActions,
} from '../../../services/store';
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
  const { eduStudents, eduCohorts, eduCertificates, currentBusiness } = useAtriumSelector(
    (s) => ({
      eduStudents: selectCurrentEduStudentsFromState(s),
      eduCohorts: selectCurrentEduCohortsFromState(s),
      eduCertificates: selectCurrentEduCertificatesFromState(s),
      currentBusiness: selectCurrentBusinessFromState(s),
    }),
    shallowEqualObjects
  );
  const { issueEduCertificate } = useAtriumActions();

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
      <div className="sq-elev-pop w-full max-w-4xl">
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] flex flex-col max-h-[92vh] overflow-hidden"
        >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--atr-divider)] bg-[#F3EDE7] dark:bg-[#22201E] print:hidden">
          <div>
            <h2 className="t-card font-semibold text-black dark:text-white">
              {t(activeCert ? 'edu_cert_modal_title_view' : 'edu_cert_modal_title')}
            </h2>
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
              className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 t-cap">
          {!activeCert ? (
            /* Creation Form */
            <form onSubmit={handleIssue} className="space-y-4 max-w-xl mx-auto py-2">
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

              <div className="pt-4 flex justify-end gap-3 border-t border-[var(--atr-divider)]">
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
            <div className="printable-document preserve-border max-w-2xl mx-auto p-8 rounded-[var(--r-card,16px)] border-4 border-double border-[#d4522f]/40 bg-gradient-to-br from-[#FDF4F0]/40 via-white to-[#FDF4F0]/20 shadow-xl relative overflow-hidden">
              {/* Watermark in BG */}
              <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                <GraduationCap size={240} />
              </div>

              <div className="text-center space-y-4 relative z-10">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-[#FCEEE8] text-[var(--brand-text,#BF431F)] mb-1">
                  <ShieldCheck size={36} />
                </div>

                <div className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] rtl:normal-case rtl:tracking-normal">
                  {currentBusiness?.displayName || 'Atlas Academy & Tutoring Institute'}
                </div>

                <h2 className="t-kpi-m uppercase text-black rtl:tracking-normal tabular-nums">
                  {t('edu_cert_doc_title')}
                </h2>

                <p className="t-cap text-black/70 italic">
                  {t('edu_cert_awarded_to')}
                </p>

                <div className="py-2">
                  <div className="t-kpi-m uppercase text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] border-b-2 border-[#d4522f]/30 inline-block px-8 pb-1 tabular-nums">
                    {activeCert.studentName}
                  </div>
                </div>

                <p className="t-body text-black max-w-lg mx-auto leading-relaxed">
                  {t('edu_cert_for_curriculum')}
                </p>

                <div className="t-pod font-semibold text-black">
                  {activeCert.courseTitle}
                </div>

                {activeCert.honors && (
                  <div className="inline-block t-small font-semibold px-3 py-1 rounded-full bg-[#FCEEE8] text-[var(--brand-text,#BF431F)]">
                    {activeCert.honors} · {t('edu_cert_final_score')} {activeCert.averageGradeScore}%
                  </div>
                )}

                <div className="pt-8 grid grid-cols-2 gap-8 border-t border-[#d4522f]/20 mt-8 text-left rtl:text-right">
                  <div>
                    <div className="t-small font-semibold text-black">
                      {activeCert.signatoryName}
                    </div>
                    <div className="t-cap text-black/70">
                      {activeCert.signatoryTitle}
                    </div>
                    <div className="t-cap text-black/55 mt-1">
                      {t('edu_cert_date_issued')} {activeCert.issueDate}
                    </div>
                  </div>

                  <div className="text-right rtl:text-left">
                    <div className="t-cap tabular-nums text-black/55 rtl:normal-case rtl:tracking-normal">
                      {t('edu_cert_verif_hash')}
                    </div>
                    <div className="t-small tabular-nums font-medium text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                      {activeCert.verificationHash}
                    </div>
                    <div className="t-cap text-black/55 mt-1">
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
    </div>
  );
};

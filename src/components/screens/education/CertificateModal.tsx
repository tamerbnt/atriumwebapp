import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  FileCheck,
  ShieldCheck,
  GraduationCap,
  RefreshCw,
  Ban,
} from 'lucide-react';
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentEduStudentsFromState,
  selectCurrentEduCohortsFromState,
  selectCurrentBusinessFromState,
  useAtriumActions,
} from '../../../services/store';
import { EduCertificate } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { Button } from '@/atrium/core';
import { useTranslation } from '../../../utils/useTranslation';
import { KineticModalShell, useRetainedModalValue } from '../../ui/kinetic';

interface CertificateModalProps {
  isOpen?: boolean;
  certificate?: EduCertificate | null;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen = true,
  certificate: existingCert,
  onClose,
}) => {
  const { t, language } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const { eduStudents, eduCohorts, currentBusiness } = useAtriumSelector(
    (s) => ({
      eduStudents: selectCurrentEduStudentsFromState(s),
      eduCohorts: selectCurrentEduCohortsFromState(s),
      currentBusiness: selectCurrentBusinessFromState(s),
    }),
    shallowEqualObjects
  );
  const { issueEduCertificate, reissueEduCertificate, revokeEduCertificate } = useAtriumActions();

  const defaultOrgName = currentBusiness?.displayName || L('Academic Institute', 'Établissement de Formation', 'المؤسسة التكوينية');
  const defaultSignatory = currentBusiness?.ownerName || L('Academic Director', 'Directeur Pédagogique', 'المدير البيداغوجي');
  const defaultTitle = L('Academic Dean & Program Director', 'Direction Pédagogique', 'الإدارة البيداغوجية');

  const [studentId, setStudentId] = useState<string>(
    existingCert?.studentId || eduStudents[0]?.id || ''
  );
  const [cohortId, setCohortId] = useState<string>(
    existingCert?.cohortId || eduCohorts[0]?.id || ''
  );
  const [honors, setHonors] = useState<string>(
    existingCert?.honors || 'With Distinction'
  );
  const [signatoryName, setSignatoryName] = useState<string>(
    existingCert?.signatoryName || defaultSignatory
  );
  const [signatoryTitle, setSignatoryTitle] = useState<string>(
    existingCert?.signatoryTitle || defaultTitle
  );
  const [averageGrade, setAverageGrade] = useState<number>(
    existingCert?.averageGradeScore || 90
  );

  const [previewCert, setPreviewCert] = useState<EduCertificate | null>(
    existingCert || null
  );
  const [isRevokeInputOpen, setIsRevokeInputOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const retainedExistingCert = useRetainedModalValue(isOpen ? existingCert ?? null : null);

  useEffect(() => {
    if (!isOpen) return;
    setPreviewCert(existingCert || null);
    setStudentId(existingCert?.studentId || eduStudents[0]?.id || '');
    setCohortId(existingCert?.cohortId || eduCohorts[0]?.id || '');
    setHonors(existingCert?.honors || 'With Distinction');
    setSignatoryName(existingCert?.signatoryName || defaultSignatory);
    setSignatoryTitle(existingCert?.signatoryTitle || defaultTitle);
    setAverageGrade(existingCert?.averageGradeScore || 90);
    setIsRevokeInputOpen(false);
    setRevokeReason('');
  }, [isOpen, existingCert, defaultSignatory, defaultTitle]);

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

  const activeCert = previewCert || (isOpen ? existingCert : retainedExistingCert);

  const handleReissue = () => {
    if (!activeCert) return;
    const reissued = reissueEduCertificate(activeCert.id);
    if (reissued) setPreviewCert(reissued);
  };

  const handleConfirmRevoke = () => {
    if (!activeCert) return;
    const ok = revokeEduCertificate(activeCert.id, revokeReason || L('Administrative revocation', 'Révocation administrative', 'إلغاء إداري'));
    if (ok) {
      setPreviewCert({
        ...activeCert,
        status: 'revoked',
        revokedAt: new Date().toISOString(),
        revokedReason: revokeReason || L('Administrative revocation', 'Révocation administrative', 'إلغاء إداري'),
      });
      setIsRevokeInputOpen(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  };

  const isRevoked = activeCert?.status === 'revoked';

  return (
    <KineticModalShell isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-4xl" zIndexClass="z-[9990]">
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="relative w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] flex flex-col max-h-[92vh] overflow-hidden print:max-h-none print:shadow-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-b border-[var(--atr-divider)] bg-[#F3EDE7] dark:bg-[#22201E] print:hidden">
          <div className="flex items-center gap-2.5">
            <h2 className="t-card font-semibold text-black dark:text-white">
              {t(activeCert ? 'edu_cert_modal_title_view' : 'edu_cert_modal_title')}
            </h2>
            {activeCert && (
              <span
                className={`px-2 py-0.5 rounded-full t-small font-semibold ${
                  isRevoked
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                }`}
              >
                {isRevoked ? L('Revoked', 'Révoqué', 'ملغى') : L('Verified', 'Valide', 'ساري')}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {activeCert && !isRevoked && (
              <>
                <Button
                  tone="soft"
                  size={36}
                  leading={<RefreshCw size={14} />}
                  onClick={handleReissue}
                  data-testid="cert-reissue-btn"
                >
                  {L('Reissue', 'Rééditer', 'إعادة إصدار')}
                </Button>
                <Button
                  tone="soft"
                  size={36}
                  leading={<Ban size={14} />}
                  onClick={() => setIsRevokeInputOpen((v) => !v)}
                  data-testid="cert-revoke-toggle-btn"
                >
                  {L('Revoke', 'Révoquer', 'إلغاء')}
                </Button>
              </>
            )}
            {activeCert && (
              <Button
                tone="soft"
                size={36}
                leading={<Printer size={14} />}
                onClick={handlePrint}
              >
                {t('edu_cert_print')}
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 t-cap">
          {isRevokeInputOpen && activeCert && !isRevoked && (
            <div
              data-sq="card"
              data-sq-border="solid"
              className="max-w-2xl mx-auto p-4 bg-rose-50 dark:bg-rose-950/30 space-y-3 print:hidden"
            >
              <LabelInput
                field="RevokeReason"
                label={L('Revocation Reason', 'Motif de révocation', 'سبب الإلغاء')}
                value={revokeReason}
                onChange={setRevokeReason}
                placeholder={L('e.g. Academic integrity or clerical error', 'Ex: Erreur matérielle ou annulation', 'مثال: خطأ إداري')}
                width="100%"
                height={38}
                corner={10}
              />
              <div className="flex justify-end gap-2">
                <Button tone="soft" size={32} type="button" onClick={() => setIsRevokeInputOpen(false)}>
                  {t('common_cancel')}
                </Button>
                <Button tone="accent" size={32} type="button" onClick={handleConfirmRevoke} data-testid="cert-revoke-confirm-btn">
                  {L('Confirm Revoke', 'Confirmer Révocation', 'تأكيد الإلغاء')}
                </Button>
              </div>
            </div>
          )}

          {!activeCert ? (
            <form onSubmit={handleIssue} className="space-y-4 max-w-xl mx-auto py-2">
              <LabelSelect
                field="RecipientStudent"
                label={t('edu_cert_recipient')}
                value={studentId}
                onChange={setStudentId}
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

              <LabelSelect
                field="CompletedCohort"
                label={t('edu_cert_cohort')}
                value={cohortId}
                onChange={setCohortId}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  field="CumulativeGrade"
                  label={t('edu_cert_grade')}
                  type="number"
                  min={0}
                  max={100}
                  value={averageGrade}
                  onChange={(val) => setAverageGrade(parseInt(val, 10) || 0)}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <div className="pt-4 flex justify-end gap-2.5 border-t border-[var(--atr-divider)]">
                <Button tone="soft" size={40} type="button" onClick={onClose}>
                  {t('common_cancel')}
                </Button>
                <Button tone="accent" size={40} leading={<FileCheck size={14} />} type="submit">
                  {t('edu_cert_generate')}
                </Button>
              </div>
            </form>
          ) : (
            <div className="printable-document preserve-border max-w-2xl mx-auto p-8 rounded-[var(--r-card,16px)] border-4 border-double border-[#d4522f]/40 bg-gradient-to-br from-[#FDF4F0]/40 via-white to-[#FDF4F0]/20 shadow-xl relative overflow-hidden">
              {isRevoked && (
                <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-20 opacity-20">
                  <span className="text-5xl font-black uppercase tracking-[0.25em] -rotate-12 text-rose-700 border-4 border-rose-700 px-6 py-2 rounded-xl">
                    {L('REVOKED', 'RÉVOQUÉ', 'ملغى')}
                  </span>
                </div>
              )}

              <div className="absolute end-4 bottom-4 opacity-5 pointer-events-none text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                <GraduationCap size={240} />
              </div>

              <div className="text-center space-y-4 relative z-10">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-[#FCEEE8] text-[var(--brand-text,#BF431F)] mb-1">
                  <ShieldCheck size={36} />
                </div>

                <div className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] rtl:normal-case rtl:tracking-normal">
                  {defaultOrgName}
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

                {isRevoked && activeCert.revokedReason && (
                  <div className="t-small text-rose-700 font-semibold">
                    {L('Revoked Reason:', 'Motif :', 'سبب الإلغاء:')} {activeCert.revokedReason}
                  </div>
                )}

                <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 gap-8 border-t border-[#d4522f]/20 mt-8 text-start">
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

                  <div className="sm:text-end">
                    <div className="t-cap tabular-nums text-black/55 rtl:normal-case rtl:tracking-normal">
                      {t('edu_cert_verif_hash')}
                    </div>
                    <div className="t-small tabular-nums font-medium text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" data-testid="cert-verif-hash">
                      {activeCert.verificationHash}
                    </div>
                    <div className="t-cap text-black/55 mt-1" data-testid="cert-number">
                      {t('edu_cert_id')} #{activeCert.certificateNumber}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </KineticModalShell>
  );
};

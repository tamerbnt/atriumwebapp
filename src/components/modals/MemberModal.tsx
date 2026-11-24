import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, AlertCircle } from 'lucide-react';
import {
  useAtriumSelector,
  selectCurrentPlansFromState,
  selectCurrentBranchFromState,
  selectTerminologyFromState,
  addMemberAction,
  updateMemberAction,
} from '../../services/store';
import { Member, Gender } from '../../types/index';
import {
  MODAL_FOCUS_DELAY_MS,
  registerKineticMemberModalOpener,
} from './memberModalMotion';
import { KineticModalShell, useRetainedModalValue } from '../ui/kinetic/KineticModalShell';
import { Button, LiquidButton } from '@/atrium/core';
import { LiveSegmentedControl } from '../ui/live/LiveSegmentedControl';
import { LabelInput } from '../ui/LabelInput';
import { LabelSelect } from '../ui/LabelSelect';
import { t } from '../../utils/i18n';

export interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberToEdit?: Member | null;
  prefillName?: string;
  onCreatedSuccess?: (member: Member) => void;
  useKineticSpring?: boolean;
  originElement?: HTMLElement | null;
}

export const MemberModal: React.FC<MemberModalProps> = React.memo(({
  isOpen,
  onClose,
  memberToEdit,
  prefillName,
  onCreatedSuccess,
  useKineticSpring = false,
  originElement,
}) => {
  const plans = useAtriumSelector(selectCurrentPlansFromState);
  const currentBranch = useAtriumSelector(selectCurrentBranchFromState);
  const terminology = useAtriumSelector(selectTerminologyFromState);
  const addMember = addMemberAction;
  const updateMember = updateMemberAction;
  const language = useAtriumSelector((s) => s.language);

  const getDefaultCardId = () => `RFID-${Math.floor(100000 + Math.random() * 900000)}`;
  const getTodayIso = () => new Date().toISOString().split('T')[0];

  const [imperativePayload, setImperativePayload] = useState<{
    open: boolean;
    member: Member | null;
    prefillName?: string;
    originElement?: HTMLElement | null;
  } | null>(null);

  const effectiveOpen = isOpen || Boolean(imperativePayload?.open);
  const effectiveMember = imperativePayload?.open ? imperativePayload.member : (memberToEdit ?? null);
  const effectivePrefill = imperativePayload?.open ? imperativePayload.prefillName : prefillName;
  const effectiveOrigin = imperativePayload?.open
    ? (imperativePayload.originElement ?? originElement)
    : originElement;

  const displayedEdit = useRetainedModalValue(effectiveOpen ? effectiveMember : undefined);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form values
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [planId, setPlanId] = useState(() => plans[0]?.id || '');
  const [cardId, setCardId] = useState(() => getDefaultCardId());
  const [gender, setGender] = useState<Gender>('Male');
  const [dateOfBirth, setDateOfBirth] = useState('1995-01-01');
  const [startDate, setStartDate] = useState(() => getTodayIso());
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [source, setSource] = useState('Walk-in');
  const [notes, setNotes] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<{ fullName?: string; email?: string }>({});

  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const formDirtyRef = useRef<boolean>(false);
  const lastPreparedKeyRef = useRef<string | null>(null);

  const applyFormForMember = useCallback(
    (target: Member | null, initialFullName?: string) => {
      if (target) {
        setFullName(target.fullName || '');
        setEmail(target.email || '');
        setPhoneNumber(target.phoneNumber || '');
        setPlanId(target.membershipPlanId || plans[0]?.id || '');
        setCardId(target.cardId || '');
        setGender(target.gender || 'Male');
        setDateOfBirth(target.dateOfBirth || '');
        setStartDate(target.startDate || '');
        setEmergencyName(target.emergencyContactName || '');
        setEmergencyPhone(target.emergencyContactPhone || '');
        setSource(target.source || 'Walk-in');
        setNotes(target.notes || '');
      } else {
        setFullName(initialFullName || '');
        setEmail('');
        setPhoneNumber('');
        setPlanId(plans[0]?.id || '');
        setCardId(getDefaultCardId());
        setGender('Male');
        setDateOfBirth('1995-01-01');
        setStartDate(getTodayIso());
        setEmergencyName('');
        setEmergencyPhone('');
        setSource('Walk-in');
        setNotes('');
      }
      formDirtyRef.current = false;
      setErrors({});
      setIsSubmitting(false);
    },
    [plans]
  );

  // Sync form only when opening or switching member target
  useEffect(() => {
    if (!effectiveOpen) {
      lastPreparedKeyRef.current = null;
      return;
    }
    const nextKey = effectiveMember
      ? `edit:${effectiveMember.id}`
      : effectivePrefill
      ? `create:${effectivePrefill}`
      : 'create';
    if (lastPreparedKeyRef.current !== nextKey) {
      lastPreparedKeyRef.current = nextKey;
      applyFormForMember(effectiveMember, effectivePrefill);
    }
  }, [effectiveOpen, effectiveMember, effectivePrefill, applyFormForMember]);

  // Focus first field gently after open on non-touch devices
  useEffect(() => {
    if (!effectiveOpen) return;
    const isTouch =
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(pointer: coarse)').matches);
    if (isTouch) return;
    const timer = window.setTimeout(() => {
      nameInputRef.current?.focus({ preventScroll: true });
    }, MODAL_FOCUS_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [effectiveOpen]);

  // Optional imperative opener compatibility
  useEffect(() => {
    return registerKineticMemberModalOpener(({ member, originElement: reqOrigin, prefillName: reqPrefill }) => {
      setImperativePayload({
        open: true,
        member: (member as Member | null) ?? null,
        prefillName: reqPrefill,
        originElement: reqOrigin,
      });
    });
  }, []);

  const requestClose = useCallback(() => {
    setImperativePayload(null);
    onClose();
  }, [onClose]);

  // Form submit handler with validation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const newErrors: { fullName?: string; email?: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Le nom est obligatoire.';
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      newErrors.email = 'Veuillez saisir une adresse email valide.';
    }

    if (Object.keys(newErrors).length > 0) {
      formDirtyRef.current = true;
      setErrors(newErrors);
      if (newErrors.fullName) {
        nameInputRef.current?.focus();
      } else if (newErrors.email) {
        emailInputRef.current?.focus();
      }
      return;
    }

    formDirtyRef.current = true;
    setIsSubmitting(true);

    const selectedPlan = plans.find((p) => p.id === planId) || plans[0];
    const durationDays = selectedPlan ? selectedPlan.durationDays : 30;
    const start = new Date(startDate || Date.now());
    const expDate = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const expirationDate = expDate.toISOString().split('T')[0];

    const targetEdit = effectiveMember || displayedEdit;
    if (targetEdit) {
      const updatedFields: Partial<Member> = {
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        cardId: cardId.trim(),
        gender,
        dateOfBirth,
        startDate,
        membershipPlanId: selectedPlan?.id,
        membershipPlanName: selectedPlan?.name,
        emergencyContactName: emergencyName.trim(),
        emergencyContactPhone: emergencyPhone.trim(),
        source,
        notes: notes.trim(),
      };

      updateMember(targetEdit.id, updatedFields);
      requestClose();
    } else {
      const newMember = addMember({
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        cardId: cardId.trim(),
        status: 'Active',
        startDate,
        expirationDate,
        membershipPlanId: selectedPlan?.id,
        membershipPlanName: selectedPlan?.name,
        remainingSessions: durationDays >= 90 ? 999 : 30,
        gender,
        dateOfBirth,
        source,
        emergencyContactName: emergencyName.trim(),
        emergencyContactPhone: emergencyPhone.trim(),
        notes: notes.trim(),
      });

      window.dispatchEvent(new CustomEvent('atrium-member-created', { detail: newMember }));
      onCreatedSuccess?.(newMember);
      requestClose();
    }
  };

  const genderOptions = useMemo(
    () => [
      { value: 'Male', label: t('member_gender_male', language) },
      { value: 'Female', label: t('member_gender_female', language) },
      { value: 'Other', label: t('member_gender_other', language) },
    ],
    [language]
  );

  const planOptions = useMemo(
    () =>
      plans.map((p) => {
        const priceVal = typeof p.price === 'number' ? p.price : p.price?.amount ?? 0;
        return {
          value: p.id,
          label: p.name,
          sublabel: `${p.durationDays} j · ${priceVal.toLocaleString()} DZD`,
        };
      }),
    [plans]
  );

  const sourceOptions = useMemo(
    () => [
      { value: 'Walk-in', label: 'Passage direct' },
      { value: 'Instagram', label: 'Instagram' },
      { value: 'Facebook', label: 'Facebook' },
      { value: 'Referral', label: 'Parrainage' },
      { value: 'Website', label: 'Site web' },
      { value: 'VIP Partner', label: 'Partenaire' },
    ],
    []
  );

  return (
    <KineticModalShell
      isOpen={effectiveOpen}
      onClose={requestClose}
      originElement={effectiveOrigin}
      maxWidthClass="max-w-xl"
      zIndexClass="z-[9990]"
      ariaLabelledBy="member-modal-title"
      dialogClassName="text-left"
    >
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="relative w-full max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)]"
      >
        <div className="p-[var(--s6)] flex flex-col gap-[var(--s4)] overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-[var(--s4)] pb-[var(--s4)] border-b border-[var(--atr-divider)]">
          <div className="flex flex-col gap-[var(--s1)]">
            <h3
              id="member-modal-title"
              className="t-dialog text-[var(--text-1)]"
            >
              {displayedEdit
                ? language === 'ar'
                  ? `تعديل ملف ${terminology.memberSingle}`
                  : `Modifier la fiche ${terminology.memberSingle.toLowerCase()}`
                : language === 'ar'
                ? `تسجيل ${terminology.memberSingle} جديد`
                : `Nouveau ${terminology.memberSingle.toLowerCase()}`}
            </h3>
            <p className="t-cap text-[var(--text-2)]">
              {currentBranch.name} · Atrium Health & Roster
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Fermer la boîte de dialogue"
            className="w-[var(--seg-m-h,32px)] h-[var(--seg-m-h,32px)] rounded-full grid place-items-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[#F3EDE7] dark:hover:bg-[#262422] transition-colors cursor-pointer shrink-0"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-[var(--s4)]">
          {/* Section 1: Identification */}
          <div className="flex flex-col gap-[var(--s3)]">
            <h4 className="t-small font-semibold text-[var(--text-2)]">
              {t('member_section_personal', language)}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--s3)]">
              {/* Full Name Field */}
              {useKineticSpring ? (
                <div>
                  <LabelInput
                    inputRef={nameInputRef}
                    id="member-fullName"
                    name="fullName"
                    field="FullName"
                    label={`${t('modal_name', language)} *`}
                    required
                    value={fullName}
                    error={errors.fullName}
                    errorId="fullName-error"
                    onChange={(val) => {
                      formDirtyRef.current = true;
                      setFullName(String(val));
                      if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                    }}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-[var(--s1)]">
                  <label
                    htmlFor="member-fullName"
                    className="t-small font-medium text-[var(--text-2)]"
                  >
                    {t('modal_name', language)} *
                  </label>
                  <div
                    data-sq="ctl"
                    data-sq-border="solid"
                    data-sq-stroke-w={errors.fullName ? '1.5' : undefined}
                    className={`relative bg-[#F5F1EC] dark:bg-[#292624] focus-within:bg-white dark:focus-within:bg-[#2E2B28] transition-colors ${
                      errors.fullName
                        ? '[--sq-stroke:#B8321C]'
                        : '[--sq-stroke:rgba(23,19,15,0.055)] dark:[--sq-stroke:rgba(255,255,255,0.075)] focus-within:[--sq-stroke:#C9441F]'
                    }`}
                  >
                    <input
                      ref={nameInputRef}
                      id="member-fullName"
                      name="fullName"
                      type="text"
                      required
                      aria-invalid={Boolean(errors.fullName)}
                      aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                      value={fullName}
                      onChange={(e) => {
                        formDirtyRef.current = true;
                        setFullName(e.target.value);
                        if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                      }}
                      className="w-full h-[var(--btn-h,40px)] px-[var(--s3)] bg-transparent border-0 t-body font-medium text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none"
                      placeholder="ex: Amira Belkacem"
                    />
                  </div>
                  {errors.fullName && (
                    <p
                      id="fullName-error"
                      role="alert"
                      className="t-cap font-medium text-[#B8321C] flex items-center gap-[var(--s1)]"
                    >
                      <AlertCircle size={16} strokeWidth={1.5} className="shrink-0" />
                      <span>{errors.fullName}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Email Field */}
              {useKineticSpring ? (
                <div>
                  <LabelInput
                    inputRef={emailInputRef}
                    id="member-email"
                    name="email"
                    type="email"
                    field="Email"
                    label={`${t('modal_email', language)} *`}
                    required
                    value={email}
                    error={errors.email}
                    errorId="email-error"
                    onChange={(val) => {
                      formDirtyRef.current = true;
                      setEmail(String(val));
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-[var(--s1)]">
                  <label
                    htmlFor="member-email"
                    className="t-small font-medium text-[var(--text-2)]"
                  >
                    {t('modal_email', language)} *
                  </label>
                  <div
                    data-sq="ctl"
                    data-sq-border="solid"
                    data-sq-stroke-w={errors.email ? '1.5' : undefined}
                    className={`relative bg-[#F5F1EC] dark:bg-[#292624] focus-within:bg-white dark:focus-within:bg-[#2E2B28] transition-colors ${
                      errors.email
                        ? '[--sq-stroke:#B8321C]'
                        : '[--sq-stroke:rgba(23,19,15,0.055)] dark:[--sq-stroke:rgba(255,255,255,0.075)] focus-within:[--sq-stroke:#C9441F]'
                    }`}
                  >
                    <input
                      ref={emailInputRef}
                      id="member-email"
                      name="email"
                      type="email"
                      required
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                      value={email}
                      onChange={(e) => {
                        formDirtyRef.current = true;
                        setEmail(e.target.value);
                        if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      className="w-full h-[var(--btn-h,40px)] px-[var(--s3)] bg-transparent border-0 t-body font-medium text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none"
                      placeholder="contact@domaine.com"
                    />
                  </div>
                  {errors.email && (
                    <p
                      id="email-error"
                      role="alert"
                      className="t-cap font-medium text-[#B8321C] flex items-center gap-[var(--s1)]"
                    >
                      <AlertCircle size={16} strokeWidth={1.5} className="shrink-0" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Phone Field */}
              <div>
                <LabelInput
                  field="Phone"
                  label={t('modal_phone', language)}
                  value={phoneNumber}
                  onChange={(val) => {
                    formDirtyRef.current = true;
                    setPhoneNumber(val);
                  }}
                  type="tel"
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>

              {/* Gender and Birth Date */}
              <div className="grid grid-cols-2 gap-[var(--s2)] items-start">
                {useKineticSpring ? (
                  <LabelSelect
                    field="Gender"
                    label={t('member_field_gender', language)}
                    value={gender}
                    onChange={(val) => {
                      formDirtyRef.current = true;
                      setGender((val?.target?.value ?? val) as Gender);
                    }}
                    options={genderOptions}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                ) : (
                  <div className="flex flex-col gap-[var(--s1)]">
                    <label className="t-small font-medium text-[var(--text-2)]">
                      {t('member_field_gender', language)}
                    </label>
                    <LiveSegmentedControl
                      fullWidth
                      size="md"
                      value={gender}
                      onValueChange={(val) => {
                        formDirtyRef.current = true;
                        setGender(val as Gender);
                      }}
                      options={genderOptions}
                      aria-label={t('member_field_gender', language)}
                    />
                  </div>
                )}

                <LabelInput
                  field="BirthDate"
                  label={t('member_field_birth_date', language)}
                  type="date"
                  value={dateOfBirth}
                  onChange={(val) => {
                    formDirtyRef.current = true;
                    setDateOfBirth(val);
                  }}
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>
            </div>
            </div>

            {/* Section 2: Membership Plan */}
            <div className="flex flex-col gap-[var(--s3)] pt-[var(--s3)] border-t border-[var(--atr-divider)]">
              <h4 className="t-small font-semibold text-[var(--text-2)]">
                {t('member_section_membership', language)}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--s3)]">
                <LabelSelect
                  field="PlanPackage"
                  label={`${t('member_field_plan_package', language)} *`}
                  value={planId}
                  onChange={(val) => {
                    formDirtyRef.current = true;
                    setPlanId(val?.target?.value ?? val);
                  }}
                  options={planOptions}
                  width="100%"
                  height={40}
                  corner={12}
                />

                <LabelInput
                  field="StartDate"
                  label={t('member_field_start_date', language)}
                  type="date"
                  value={startDate}
                  onChange={(val) => {
                    formDirtyRef.current = true;
                    setStartDate(val);
                  }}
                  width="100%"
                  height={40}
                  corner={12}
                />

                <LabelInput
                  field="CardId"
                  label={t('member_field_rfid_card', language)}
                  value={cardId}
                  onChange={(val) => {
                    formDirtyRef.current = true;
                    setCardId(val);
                  }}
                  placeholder="RFID-XXXXXX"
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>
            </div>

            {/* Section 3: Emergency & Notes */}
            <div className="flex flex-col gap-[var(--s3)] pt-[var(--s3)] border-t border-[var(--atr-divider)]">
              <h4 className="t-small font-semibold text-[var(--text-2)]">
                {t('member_section_emergency', language)}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--s3)]">
                <LabelInput
                  field="EmergencyContact"
                  label={t('member_field_emergency_contact', language)}
                  value={emergencyName}
                  onChange={(val) => {
                    formDirtyRef.current = true;
                    setEmergencyName(val);
                  }}
                  placeholder="Nom du proche"
                  width="100%"
                  height={40}
                  corner={12}
                />

                <LabelInput
                  field="EmergencyPhone"
                  label={t('member_field_emergency_phone', language)}
                  type="tel"
                  value={emergencyPhone}
                  onChange={(val) => {
                    formDirtyRef.current = true;
                    setEmergencyPhone(val);
                  }}
                  placeholder="+213 555 00 00 00"
                  width="100%"
                  height={40}
                  corner={12}
                />

                <LabelSelect
                  field="AcquisitionChannel"
                  label={t('member_field_acquisition', language)}
                  value={source}
                  onChange={(val) => {
                    formDirtyRef.current = true;
                    setSource(val?.target?.value ?? val);
                  }}
                  options={sourceOptions}
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>

              <div className="flex flex-col gap-[var(--s1)]">
                <label className="t-small font-semibold text-[var(--text-1)]">
                  {t('member_field_private_notes', language)}
                </label>
                <div
                  data-sq="ctl"
                  data-sq-border="solid"
                  className="relative bg-[#F5F1EC] dark:bg-[#292624] focus-within:bg-white dark:focus-within:bg-[#2E2B28] transition-colors [--sq-stroke:rgba(23,19,15,0.055)] dark:[--sq-stroke:rgba(255,255,255,0.075)] focus-within:[--sq-stroke:#C9441F]"
                >
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => {
                      formDirtyRef.current = true;
                      setNotes(e.target.value);
                    }}
                    placeholder="Notes médicales, objectifs ou restrictions..."
                    className="w-full p-[var(--s3)] t-body bg-transparent border-0 text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none resize-none block"
                  />
                </div>
              </div>
            </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-[var(--s3)] pt-[var(--s3)] border-t border-[var(--atr-divider)]">
            <Button
              type="button"
              tone="soft"
              size={40}
              onClick={requestClose}
            >
              {t('action_cancel', language)}
            </Button>

            <LiquidButton
              kind={displayedEdit ? 'confirm' : 'create'}
              type="submit"
              disabled={isSubmitting}
              labels={{
                idle: displayedEdit
                  ? t('action_save', language)
                  : `Inscrire ${terminology.memberSingle.toLowerCase()}`,
              }}
            />
          </div>
        </form>
        </div>
      </div>
    </KineticModalShell>
  );
});

MemberModal.displayName = 'MemberModal';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle } from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { Member, Gender } from '../../types/index';
import { Sp, clamp, TUNES } from '../screens/membership/motion/adherentsMotion';
import { Button, LiquidButton } from '@/atrium';
import { LiveSegmentedControl } from '../ui/live/LiveSegmentedControl';
import { LabelInput } from '../ui/LabelInput';
import { LabelSelect } from '../ui/LabelSelect';
import { t } from '../../utils/i18n';

export interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberToEdit?: Member | null;
  onCreatedSuccess?: (member: Member) => void;
}

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  onClose,
  memberToEdit,
  onCreatedSuccess,
}) => {
  const {
    plans,
    currentBranch,
    terminology,
    addMember,
    updateMember,
    language,
    showToast,
  } = useAtriumStore();

  const [isHidden, setIsHidden] = useState(!isOpen);
  const [val, setVal] = useState(0);
  const [transformOrigin, setTransformOrigin] = useState('center center');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form values
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [planId, setPlanId] = useState('');
  const [cardId, setCardId] = useState('');
  const [gender, setGender] = useState<Gender>('Male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [source, setSource] = useState('Walk-in');
  const [notes, setNotes] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<{ fullName?: string; email?: string }>({});

  const springRef = useRef<Sp | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const scrimRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const closeRequestedRef = useRef(false);

  // Initialize spring dp (tune 28)
  if (!springRef.current) {
    springRef.current = new Sp(0, TUNES.modal);
  }

  // Subscribe to spring motion
  useEffect(() => {
    const s = springRef.current!;
    const unsub = s.subscribe((v) => {
      setVal(v);
      if (s.t === 0 && s.rest() && closeRequestedRef.current) {
        setIsHidden(true);
        closeRequestedRef.current = false;

        // Restore focus to opener or to New client button
        if (openerRef.current && document.body.contains(openerRef.current)) {
          openerRef.current.focus();
        } else {
          const newBtn = document.querySelector<HTMLElement>('[data-action="add-member"]');
          newBtn?.focus();
        }

        onClose();
      }
    });

    return () => unsub();
  }, [onClose]);

  // Request close lifecycle with reverse spring animation
  const requestClose = useCallback(() => {
    if (closeRequestedRef.current) return;
    closeRequestedRef.current = true;
    const s = springRef.current!;
    s.setTarget(0);
  }, []);

  // Handle open / close lifecycle transitions
  useEffect(() => {
    const s = springRef.current!;

    if (isOpen) {
      closeRequestedRef.current = false;
      // 1. Remove hidden first
      setIsHidden(false);

      // Measure opener button centre relative to dialog top-left
      // "measure the dialog with offsetLeft/offsetTop, not a scaled getBoundingClientRect"
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && activeEl !== document.body) {
        openerRef.current = activeEl;
      }

      if (openerRef.current) {
        const rect = openerRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        if (dialogRef.current) {
          const ox = cx - dialogRef.current.offsetLeft;
          const oy = cy - dialogRef.current.offsetTop;
          setTransformOrigin(`${ox}px ${oy}px`);
        }
      } else {
        setTransformOrigin('center center');
      }

      // 2. Target 100
      s.setTarget(100);

      // 3. Focus first field after ~30ms
      const focusTimer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 30);

      // 4. Make background inert
      const mainAppRoot = document.getElementById('root');
      if (mainAppRoot) {
        mainAppRoot.setAttribute('inert', '');
      }

      return () => {
        clearTimeout(focusTimer);
      };
    } else {
      if (!closeRequestedRef.current && !isHidden) {
        requestClose();
      }
    }
  }, [isOpen, requestClose, isHidden]);

  // Cleanup inert when hidden
  useEffect(() => {
    if (isHidden) {
      const mainAppRoot = document.getElementById('root');
      if (mainAppRoot) {
        mainAppRoot.removeAttribute('inert');
      }
    }
  }, [isHidden]);

  // Populate or reset form fields
  useEffect(() => {
    if (!isOpen) return;

    if (memberToEdit) {
      setFullName(memberToEdit.fullName || '');
      setEmail(memberToEdit.email || '');
      setPhoneNumber(memberToEdit.phoneNumber || '');
      setPlanId(memberToEdit.membershipPlanId || plans[0]?.id || '');
      setCardId(memberToEdit.cardId || '');
      setGender(memberToEdit.gender || 'Male');
      setDateOfBirth(memberToEdit.dateOfBirth || '');
      setStartDate(memberToEdit.startDate || '');
      setEmergencyName(memberToEdit.emergencyContactName || '');
      setEmergencyPhone(memberToEdit.emergencyContactPhone || '');
      setSource(memberToEdit.source || 'Walk-in');
      setNotes(memberToEdit.notes || '');
    } else {
      setFullName('');
      setEmail('');
      setPhoneNumber('');
      setPlanId(plans[0]?.id || '');
      setCardId(`RFID-${Math.floor(100000 + Math.random() * 900000)}`);
      setGender('Male');
      setDateOfBirth('1995-01-01');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEmergencyName('');
      setEmergencyPhone('');
      setSource('Walk-in');
      setNotes('');
    }
    setErrors({});
    setIsSubmitting(false);
  }, [isOpen, memberToEdit, plans]);

  // Keyboard navigation: Escape closes, Focus Trap keeps focus within modal
  useEffect(() => {
    if (isHidden || !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHidden, isOpen, requestClose]);

  // Destroy spring on unmount
  useEffect(() => {
    return () => {
      springRef.current?.destroy();
      springRef.current = null;
      const mainAppRoot = document.getElementById('root');
      if (mainAppRoot) {
        mainAppRoot.removeAttribute('inert');
      }
    };
  }, []);

  // Form submit handler with validation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const newErrors: { fullName?: string; email?: string } = {};

    // Name required
    if (!fullName.trim()) {
      newErrors.fullName = 'Le nom est obligatoire.';
    }

    // Email regex: /^\S+@\S+\.\S+$/
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      newErrors.email = 'Veuillez saisir une adresse email valide.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Focus first invalid field
      if (newErrors.fullName) {
        nameInputRef.current?.focus();
      } else if (newErrors.email) {
        emailInputRef.current?.focus();
      }
      return;
    }

    setIsSubmitting(true);

    const selectedPlan = plans.find((p) => p.id === planId) || plans[0];
    const durationDays = selectedPlan ? selectedPlan.durationDays : 30;
    const start = new Date(startDate || Date.now());
    const expDate = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const expirationDate = expDate.toISOString().split('T')[0];

    if (memberToEdit) {
      const prevData = { ...memberToEdit };
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

      updateMember(memberToEdit.id, updatedFields);

      // On edit: show a toast with Undo ("Annuler")
      showToast({
        type: 'info',
        title: 'Adhérent modifié',
        message: `Fiche de ${fullName.trim()} mise à jour.`,
        action: {
          label: 'Annuler',
          onClick: () => {
            updateMember(memberToEdit.id, prevData);
            showToast({
              type: 'info',
              title: 'Modification annulée',
              message: `Modifications sur ${prevData.fullName} annulées.`,
            });
          },
        },
      });

      requestClose();
    } else {
      // On create: add at the top, reset a filter that would hide it, scroll to top, show a toast
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

      onCreatedSuccess?.(newMember);

      showToast({
        type: 'success',
        title: 'Nouvel adhérent créé',
        message: `${newMember.fullName} a été inscrit avec succès.`,
      });

      requestClose();
    }
  };

  // Spring calculations:
  // dq = clamp(dp/100, 0, 1.1)
  // Scrim opacity = clamp(dq*1.4, 0, 1)
  // Dialog scale = 0.72 + 0.28*dq
  const dq = clamp(val / 100, 0, 1.1);
  const scrimOpacity = clamp(dq * 1.4, 0, 1);
  const dialogScale = 0.72 + 0.28 * dq;

  const modalContent = (
    <div
      ref={scrimRef}
      role="presentation"
      hidden={isHidden}
      className="scrim fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none"
      style={{
        opacity: scrimOpacity,
      }}
      onClick={(e) => {
        if (e.target === scrimRef.current) {
          requestClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-modal-title"
        className="dialog relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[28px] bg-white dark:bg-[#1A1A1A] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.35)] border border-[#E9EEF0] dark:border-neutral-800 text-left select-text"
        style={{
          transform: `scale(${dialogScale})`,
          transformOrigin,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3
              id="member-modal-title"
              className="text-lg font-bold text-neutral-900 dark:text-white"
            >
              {memberToEdit
                ? language === 'ar'
                  ? `تعديل ملف ${terminology.memberSingle}`
                  : `Modifier la fiche ${terminology.memberSingle.toLowerCase()}`
                : language === 'ar'
                ? `تسجيل ${terminology.memberSingle} جديد`
                : `Nouveau ${terminology.memberSingle.toLowerCase()}`}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {currentBranch.name} · Atrium Health & Roster
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Fermer la boîte de dialogue"
            className="w-8 h-8 rounded-full grid place-items-center text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-4">
          {/* Section 1: Identification */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              {t('member_section_personal', language)}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Full Name Field */}
              <div>
                <label
                  htmlFor="member-fullName"
                  className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1"
                >
                  {t('modal_name', language)} *
                </label>
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
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                  }}
                  className={`w-full h-10 px-3 rounded-xl border text-sm font-medium transition-colors bg-white dark:bg-[#262422] text-[#1B1917] dark:text-[#F3EDE7] focus:outline-none ${
                    errors.fullName
                      ? 'border-[#B8321C] focus:border-[#B8321C] ring-1 ring-[#B8321C]'
                      : 'border-[#E4DCD5] dark:border-[#3A3734] focus:border-[#C9441F]'
                  }`}
                  placeholder="ex: Amira Belkacem"
                />
                {errors.fullName && (
                  <p
                    id="fullName-error"
                    role="alert"
                    className="mt-1 text-[11.5px] font-medium text-[#B8321C] flex items-center gap-1"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.fullName}</span>
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label
                  htmlFor="member-email"
                  className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1"
                >
                  {t('modal_email', language)} *
                </label>
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
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className={`w-full h-10 px-3 rounded-xl border text-sm font-medium transition-colors bg-white dark:bg-[#262422] text-[#1B1917] dark:text-[#F3EDE7] focus:outline-none ${
                    errors.email
                      ? 'border-[#B8321C] focus:border-[#B8321C] ring-1 ring-[#B8321C]'
                      : 'border-[#E4DCD5] dark:border-[#3A3734] focus:border-[#C9441F]'
                  }`}
                  placeholder="contact@domaine.com"
                />
                {errors.email && (
                  <p
                    id="email-error"
                    role="alert"
                    className="mt-1 text-[11.5px] font-medium text-[#B8321C] flex items-center gap-1"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.email}</span>
                  </p>
                )}
              </div>

              {/* Phone Field */}
              <div>
                <LabelInput
                  field="Phone"
                  label={t('modal_phone', language)}
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  type="tel"
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>

              {/* Gender and Birth Date */}
              <div className="grid grid-cols-2 gap-2 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                    {t('member_field_gender', language)}
                  </label>
                  <LiveSegmentedControl
                    fullWidth
                    size="md"
                    value={gender}
                    onValueChange={(val) => setGender(val as Gender)}
                    options={[
                      { value: 'Male', label: t('member_gender_male', language) },
                      { value: 'Female', label: t('member_gender_female', language) },
                      { value: 'Other', label: t('member_gender_other', language) },
                    ]}
                    aria-label={t('member_field_gender', language)}
                  />
                </div>

                <LabelInput
                  field="BirthDate"
                  label={t('member_field_birth_date', language)}
                  type="date"
                  value={dateOfBirth}
                  onChange={setDateOfBirth}
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Membership Plan */}
          <div className="space-y-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              {t('member_section_membership', language)}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LabelSelect
                field="PlanPackage"
                label={`${t('member_field_plan_package', language)} *`}
                value={planId}
                onChange={(val) => setPlanId(val?.target?.value ?? val)}
                options={plans.map((p) => ({
                  value: p.id,
                  label: p.name,
                  sublabel: `${p.durationDays} j · ${p.price.toLocaleString()} DZD`,
                }))}
                width="100%"
                height={40}
                corner={12}
              />

              <LabelInput
                field="StartDate"
                label={t('member_field_start_date', language)}
                type="date"
                value={startDate}
                onChange={setStartDate}
                width="100%"
                height={40}
                corner={12}
              />

              <LabelInput
                field="CardId"
                label={t('member_field_rfid_card', language)}
                value={cardId}
                onChange={setCardId}
                placeholder="RFID-XXXXXX"
                width="100%"
                height={40}
                corner={12}
              />
            </div>
          </div>

          {/* Section 3: Emergency & Notes */}
          <div className="space-y-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              {t('member_section_emergency', language)}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LabelInput
                field="EmergencyContact"
                label={t('member_field_emergency_contact', language)}
                value={emergencyName}
                onChange={setEmergencyName}
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
                onChange={setEmergencyPhone}
                placeholder="+213 555 00 00 00"
                width="100%"
                height={40}
                corner={12}
              />

              <LabelSelect
                field="AcquisitionChannel"
                label={t('member_field_acquisition', language)}
                value={source}
                onChange={(val) => setSource(val?.target?.value ?? val)}
                options={[
                  { value: 'Walk-in', label: 'Passage direct' },
                  { value: 'Instagram', label: 'Instagram' },
                  { value: 'Facebook', label: 'Facebook' },
                  { value: 'Referral', label: 'Parrainage' },
                  { value: 'Website', label: 'Site web' },
                  { value: 'VIP Partner', label: 'Partenaire' },
                ]}
                width="100%"
                height={40}
                corner={12}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                {t('member_field_private_notes', language)}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes médicales, objectifs ou restrictions..."
                className="w-full p-2.5 text-sm border rounded-xl border-[#E4DCD5] dark:border-[#3A3734] bg-white dark:bg-[#262422] text-neutral-900 dark:text-white focus:outline-none focus:border-[#C9441F] resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <Button
              type="button"
              tone="soft"
              size={40}
              onClick={requestClose}
            >
              {t('action_cancel', language)}
            </Button>

            <LiquidButton
              kind={memberToEdit ? 'confirm' : 'create'}
              type="submit"
              disabled={isSubmitting}
              labels={{
                idle: memberToEdit
                  ? t('action_save', language)
                  : `Inscrire ${terminology.memberSingle.toLowerCase()}`,
              }}
            />
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
};

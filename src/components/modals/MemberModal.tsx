import React, { useState, useEffect } from 'react';
import { useAtriumStore } from '../../services/store';
import { Member, Gender } from '../../types/index';
import { Modal } from '../ui/Modal';
import { LabelInput } from '../ui/LabelInput';
import { LabelSelect } from '../ui/LabelSelect';
import { AtriumButton } from '../ui/AtriumButton';
import { t } from '../../utils/i18n';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberToEdit?: Member | null;
}

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  onClose,
  memberToEdit,
}) => {
  const { plans, currentBranch, terminology, addMember, updateMember, language, networkMode } = useAtriumStore();

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

  useEffect(() => {
    if (!isOpen) return;

    if (memberToEdit) {
      setFullName(memberToEdit.fullName);
      setEmail(memberToEdit.email);
      setPhoneNumber(memberToEdit.phoneNumber);
      setPlanId(memberToEdit.membershipPlanId || (plans[0]?.id ?? ''));
      setCardId(memberToEdit.cardId || '');
      setGender(memberToEdit.gender);
      setDateOfBirth(memberToEdit.dateOfBirth || '');
      setStartDate(memberToEdit.startDate);
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
  }, [isOpen, memberToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPlan = plans.find((p) => p.id === planId) || plans[0];
    const durationDays = selectedPlan ? selectedPlan.durationDays : 30;

    const start = new Date(startDate || Date.now());
    const expDate = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const expirationDate = expDate.toISOString().split('T')[0];

    if (memberToEdit) {
      updateMember(memberToEdit.id, {
        fullName,
        email,
        phoneNumber,
        cardId,
        gender,
        dateOfBirth,
        startDate,
        membershipPlanId: selectedPlan?.id,
        membershipPlanName: selectedPlan?.name,
        emergencyContactName: emergencyName,
        emergencyContactPhone: emergencyPhone,
        source,
        notes,
      });
    } else {
      addMember({
        fullName,
        email,
        phoneNumber,
        cardId,
        status: 'Active',
        startDate,
        expirationDate,
        membershipPlanId: selectedPlan?.id,
        membershipPlanName: selectedPlan?.name,
        remainingSessions: durationDays >= 90 ? 999 : 30,
        gender,
        dateOfBirth,
        source,
        emergencyContactName: emergencyName,
        emergencyContactPhone: emergencyPhone,
        notes,
      });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isLoading={networkMode === 'force_skeleton'}
      title={
        memberToEdit
          ? language === 'ar'
            ? `تعديل ملف ${terminology.memberSingle}`
            : language === 'fr'
            ? `Modifier la fiche ${terminology.memberSingle.toLowerCase()}`
            : `Edit ${terminology.memberSingle}`
          : language === 'ar'
          ? `تسجيل ${terminology.memberSingle} جديد`
          : language === 'fr'
          ? `Nouveau ${terminology.memberSingle.toLowerCase()}`
          : `Add New ${terminology.memberSingle}`
      }
      subtitle={
        language === 'ar'
          ? `تسجيل في فرع ${currentBranch.name}`
          : language === 'fr'
          ? `Inscription au sein de ${currentBranch.name}`
          : `Enrolling into ${currentBranch.name}`
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: Personal Info */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            {t('member_section_personal', language)}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              field="Full Name"
              label={t('modal_name', language)}
              value={fullName}
              onChange={setFullName}
              width="100%"
              height={40}
              corner={12}
              required
            />

            <LabelInput
              field="Email"
              label={t('modal_email', language)}
              value={email}
              onChange={setEmail}
              type="email"
              width="100%"
              height={40}
              corner={12}
              required
            />

            <LabelInput
              field="Phone"
              label={t('modal_phone', language)}
              value={phoneNumber}
              onChange={setPhoneNumber}
              type="tel"
              width="100%"
              height={40}
              corner={12}
              required
            />

            <div className="grid grid-cols-2 gap-2">
              <LabelSelect
                field="Gender"
                label={t('member_field_gender', language)}
                value={gender}
                onChange={(val) => setGender(val?.target?.value ?? val)}
                options={[
                  { value: 'Male', label: t('member_gender_male', language) },
                  { value: 'Female', label: t('member_gender_female', language) },
                  { value: 'Other', label: t('member_gender_other', language) },
                ]}
                width="100%"
                height={40}
                corner={12}
              />

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

        {/* Section 2: Membership Details */}
        <div className="space-y-3 pt-2 border-t border-neutral-200/60 dark:border-neutral-800/80">
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
                sublabel: `${p.durationDays} ${t('member_days_unit', language)} · ${p.price.toLocaleString()} ${language === 'ar' ? 'د.ج' : 'DA'}`,
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

        {/* Section 3: Emergency & Source */}
        <div className="space-y-3 pt-2 border-t border-neutral-200/60 dark:border-neutral-800/80">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            {t('member_section_emergency', language)}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabelInput
              field="EmergencyContact"
              label={t('member_field_emergency_contact', language)}
              value={emergencyName}
              onChange={setEmergencyName}
              placeholder={language === 'ar' ? 'اسم جهة الاتصال' : language === 'fr' ? 'Nom du contact' : 'Contact Name'}
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
                { value: 'Walk-in', label: t('member_channel_walkin', language) },
                { value: 'Instagram', label: t('member_channel_instagram', language) },
                { value: 'Facebook', label: t('member_channel_facebook', language) },
                { value: 'Referral', label: t('member_channel_referral', language) },
                { value: 'Website', label: t('member_channel_website', language) },
                { value: 'VIP Partner', label: t('member_channel_partner', language) },
              ]}
              width="100%"
              height={40}
              corner={12}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {t('member_field_private_notes', language)}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('member_ph_medical_alerts', language)}
              style={{
                backgroundColor: 'var(--color-surface-bg)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--radius-input)',
              }}
              className="w-full p-2.5 text-sm border focus:outline-none focus:border-[#C4785A] text-neutral-900 dark:text-white resize-none"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-800/80">
          <AtriumButton
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            {t('action_cancel', language)}
          </AtriumButton>
          <AtriumButton
            type="submit"
            variant="primary"
          >
            {memberToEdit
              ? t('action_save', language)
              : language === 'ar'
              ? `تسجيل ${terminology.memberSingle}`
              : language === 'fr'
              ? `Inscrire ${terminology.memberSingle.toLowerCase()}`
              : `Enroll ${terminology.memberSingle}`}
          </AtriumButton>
        </div>
      </form>
    </Modal>
  );
};

import React, { useState, useEffect } from 'react';
import { useAtriumStore } from '../../services/store';
import { Member, Gender } from '../../types/index';
import { Modal } from '../ui/Modal';
import { LabelInput } from '../ui/LabelInput';
import { LabelSelect } from '../ui/LabelSelect';

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
  const { plans, currentBranch, terminology, addMember, updateMember } = useAtriumStore();

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
      title={memberToEdit ? `Edit ${terminology.memberSingle}` : `Add New ${terminology.memberSingle}`}
      subtitle={`Enrolling into ${currentBranch.name}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: Personal Info */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Personal Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              field="Full Name"
              label="Full Name"
              value={fullName}
              onChange={setFullName}
              width="100%"
              height={48}
              corner={14}
              required
            />

            <LabelInput
              field="Email"
              label="Email Address"
              value={email}
              onChange={setEmail}
              type="email"
              width="100%"
              height={48}
              corner={14}
              required
            />

            <LabelInput
              field="Phone"
              label="Phone Number"
              value={phoneNumber}
              onChange={setPhoneNumber}
              type="tel"
              width="100%"
              height={48}
              corner={14}
              required
            />

            <div className="grid grid-cols-2 gap-2">
              <LabelSelect
                field="Gender"
                label="Gender"
                value={gender}
                onChange={(val) => setGender(val?.target?.value ?? val)}
                options={['Male', 'Female', 'Other']}
                width="100%"
                height={48}
                corner={14}
              />

              <LabelInput
                field="BirthDate"
                label="Date of Birth"
                type="date"
                value={dateOfBirth}
                onChange={setDateOfBirth}
                width="100%"
                height={48}
                corner={14}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Membership Details */}
        <div className="space-y-3 pt-2 border-t border-neutral-200/60 dark:border-neutral-800/80">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            {terminology.plan} & Access Credentials
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabelSelect
              field="PlanPackage"
              label="Plan Package *"
              value={planId}
              onChange={(val) => setPlanId(val?.target?.value ?? val)}
              options={plans.map((p) => ({
                value: p.id,
                label: p.name,
                sublabel: `${p.durationDays} days · ${p.price.toLocaleString()} DA`,
              }))}
              width="100%"
              height={48}
              corner={14}
            />

            <LabelInput
              field="StartDate"
              label="Start Date"
              type="date"
              value={startDate}
              onChange={setStartDate}
              width="100%"
              height={48}
              corner={14}
            />

            <LabelInput
              field="CardId"
              label="RFID / Barcode Card"
              value={cardId}
              onChange={setCardId}
              placeholder="RFID-XXXXXX"
              width="100%"
              height={48}
              corner={14}
            />
          </div>
        </div>

        {/* Section 3: Emergency & Source */}
        <div className="space-y-3 pt-2 border-t border-neutral-200/60 dark:border-neutral-800/80">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Emergency & Notes
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabelInput
              field="EmergencyContact"
              label="Emergency Contact"
              value={emergencyName}
              onChange={setEmergencyName}
              placeholder="Contact Name"
              width="100%"
              height={48}
              corner={14}
            />

            <LabelInput
              field="EmergencyPhone"
              label="Emergency Phone"
              type="tel"
              value={emergencyPhone}
              onChange={setEmergencyPhone}
              placeholder="+213 555 00 00 00"
              width="100%"
              height={48}
              corner={14}
            />

            <LabelSelect
              field="AcquisitionChannel"
              label="Acquisition Channel"
              value={source}
              onChange={(val) => setSource(val?.target?.value ?? val)}
              options={[
                'Walk-in',
                'Instagram',
                'Facebook',
                'Referral',
                'Website',
                'VIP Partner',
              ]}
              width="100%"
              height={48}
              corner={14}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Private Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Medical alerts, preferences, personal trainer requests..."
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
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              backgroundColor: 'var(--color-accent)',
              borderRadius: 'var(--radius-button)',
            }}
            className="h-10 px-6 text-xs font-semibold text-white cursor-pointer shadow-xs hover:opacity-90 active:scale-98 transition-all"
          >
            {memberToEdit ? 'Save Changes' : `Enroll ${terminology.memberSingle}`}
          </button>
        </div>
      </form>
    </Modal>
  );
};

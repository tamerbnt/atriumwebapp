import React, { useState } from 'react';
import { useAtriumStore } from '../../services/store';
import { Modal } from '../ui/Modal';
import { LabelInput } from '../ui/LabelInput';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose }) => {
  const { plans, currentBranch, terminology, addLead } = useAtriumStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [source, setSource] = useState('Walk-in');
  const [preferredPlanId, setPreferredPlanId] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const plan = plans.find((p) => p.id === preferredPlanId) || plans[0];

    addLead({
      fullName,
      email,
      phoneNumber,
      source,
      status: 'Pending',
      preferredPlanId: plan?.id,
      preferredPlanName: plan?.name,
      preferredStartDate: new Date().toISOString().split('T')[0],
      notes,
    });

    onClose();
    setFullName('');
    setEmail('');
    setPhoneNumber('');
    setNotes('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Registration Request"
      subtitle={`Log applicant lead for ${currentBranch.name}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <LabelInput
          field="Prospect Name"
          label="Prospect Name *"
          value={fullName}
          onChange={setFullName}
          width="100%"
          height={44}
          corner={14}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LabelInput
            field="Email"
            label="Email Address"
            type="email"
            value={email}
            onChange={setEmail}
            width="100%"
            height={44}
            corner={14}
          />

          <LabelInput
            field="Phone Number"
            label="Phone Number *"
            type="tel"
            value={phoneNumber}
            onChange={setPhoneNumber}
            width="100%"
            height={44}
            corner={14}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Interested {terminology.plan}
            </label>
            <select
              value={preferredPlanId}
              onChange={(e) => setPreferredPlanId(e.target.value)}
              style={{
                backgroundColor: 'var(--color-surface-bg)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--radius-input)',
              }}
              className="w-full h-11 px-3 text-sm border focus:outline-none focus:border-[#C4785A] text-neutral-900 dark:text-white"
            >
              <option value="">Undecided / Inquiry</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Acquisition Source
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              style={{
                backgroundColor: 'var(--color-surface-bg)',
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--radius-input)',
              }}
              className="w-full h-11 px-3 text-sm border focus:outline-none focus:border-[#C4785A] text-neutral-900 dark:text-white"
            >
              <option value="Walk-in">Walk-in Visit</option>
              <option value="Instagram">Instagram Direct Message</option>
              <option value="Facebook">Facebook Lead Ad</option>
              <option value="Friend Referral">Friend Referral</option>
              <option value="Website Form">Online Self-Service Form</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
            Prospect Notes & Desires
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Class preferences, goals, free trial session requested..."
            style={{
              backgroundColor: 'var(--color-surface-bg)',
              borderColor: 'var(--color-border)',
              borderRadius: 'var(--radius-input)',
            }}
            className="w-full p-2.5 text-sm border focus:outline-none focus:border-[#C4785A] text-neutral-900 dark:text-white resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 text-xs font-semibold text-neutral-500 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              backgroundColor: 'var(--color-accent)',
              borderRadius: 'var(--radius-button)',
            }}
            className="h-10 px-5 text-xs font-semibold text-white cursor-pointer shadow-xs"
          >
            Submit Registration
          </button>
        </div>
      </form>
    </Modal>
  );
};

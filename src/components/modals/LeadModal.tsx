import React, { useState } from 'react';
import {
  selectCurrentBranchFromState,
  selectCurrentPlansFromState,
  selectTerminologyFromState,
  shallowEqualObjects,
  useAtriumActions,
  useAtriumSelector,
} from '../../services/store';
import { Modal } from '../ui/Modal';
import { LabelInput } from '../ui/LabelInput';
import { LabelSelect } from '../ui/LabelSelect';
import { LabelTextarea } from '../ui/LabelTextarea';
import { Button, LiquidButton } from '@/atrium/core';
import { t } from '../../utils/i18n';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose }) => {
  const { addLead } = useAtriumActions();
  const { plans, terminology, language, networkMode } = useAtriumSelector(
    (s) => ({
      plans: selectCurrentPlansFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      terminology: selectTerminologyFromState(s),
      language: s.language,
      networkMode: s.networkMode || 'online',
    }),
    shallowEqualObjects
  );

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
      isLoading={networkMode === 'force_skeleton'}
      title={t('reg_add_lead', language)}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--s4)]">
        <LabelInput
          field="Prospect Name"
          label={`${t('modal_name', language)} *`}
          value={fullName}
          onChange={setFullName}
          width="100%"
          height={40}
          corner={12}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--s3)]">
          <LabelInput
            field="Email"
            label={t('modal_email', language)}
            type="email"
            value={email}
            onChange={setEmail}
            width="100%"
            height={40}
            corner={12}
          />

          <LabelInput
            field="Phone Number"
            label={`${t('modal_phone', language)} *`}
            type="tel"
            value={phoneNumber}
            onChange={setPhoneNumber}
            width="100%"
            height={40}
            corner={12}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--s3)]">
          <LabelSelect
            field="InterestedPlan"
            label={`${terminology.plan}`}
            value={preferredPlanId}
            onChange={setPreferredPlanId}
            options={[
              { value: '', label: language === 'ar' ? 'غير محدد / استفسار عام' : language === 'fr' ? 'Indécis / Renseignement' : 'Undecided / Inquiry' },
              ...plans.map((p) => ({
                value: p.id,
                label: p.name,
                sublabel: `${p.durationDays != null ? `${p.durationDays} ${language === 'ar' ? 'يوم' : language === 'fr' ? 'jours' : 'days'}` : '—'} · ${p.price.toLocaleString()} DA`,
              })),
            ]}
            width="100%"
            height={40}
            corner={12}
          />

          <LabelSelect
            field="AcquisitionSource"
            label={language === 'ar' ? 'مصدر الاستقطاب' : language === 'fr' ? 'Canal d\'acquisition' : 'Acquisition Source'}
            value={source}
            onChange={setSource}
            options={[
              { value: 'Walk-in', label: language === 'ar' ? 'زيارة مباشرة' : language === 'fr' ? 'Visite directe' : 'Walk-in Visit' },
              { value: 'Instagram', label: 'Instagram' },
              { value: 'Facebook', label: 'Facebook' },
              { value: 'Friend Referral', label: language === 'ar' ? 'توصية صديق' : language === 'fr' ? 'Recommandation' : 'Friend Referral' },
              { value: 'Website Form', label: language === 'ar' ? 'استمارة إلكترونية' : language === 'fr' ? 'Site web' : 'Online Form' },
            ]}
            width="100%"
            height={40}
            corner={12}
          />
        </div>

        <LabelTextarea
          field="Notes"
          label={t('modal_notes', language)}
          value={notes}
          onChange={setNotes}
          rows={2}
          placeholder={
            language === 'ar'
              ? 'أهداف المشترك، تفضيلات الحصص، رغبة في حصة تجريبية...'
              : language === 'fr'
              ? 'Objectifs du prospect, créneaux souhaités, demande de séance d\'essai...'
              : 'Class preferences, goals, free trial session requested...'
          }
        />

        <div className="flex justify-end gap-[var(--s3)] pt-[var(--s4)] border-t border-[var(--atr-divider)]">
          <Button
            type="button"
            tone="soft"
            onClick={onClose}
          >
            {t('action_cancel', language)}
          </Button>
          <LiquidButton
            kind="create"
            type="submit"
            labels={{
              idle: t('action_save', language),
            }}
          />
        </div>
      </form>
    </Modal>
  );
};

import React, { useState } from 'react';
import { useAtriumStore } from '../../services/store';
import { Modal } from '../ui/Modal';
import { LabelInput } from '../ui/LabelInput';
import { LabelSelect } from '../ui/LabelSelect';
import { AtriumButton } from '../ui/AtriumButton';
import { t } from '../../utils/i18n';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose }) => {
  const { plans, currentBranch, terminology, addLead, language } = useAtriumStore();

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
      title={t('reg_add_lead', language)}
      subtitle={language === 'ar' ? `تسجيل طلب استفسار جديد لـ ${currentBranch.name}` : language === 'fr' ? `Enregistrer un prospect pour ${currentBranch.name}` : `Log applicant lead for ${currentBranch.name}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LabelSelect
            field="InterestedPlan"
            label={`${terminology.plan}`}
            value={preferredPlanId}
            onChange={(val) => setPreferredPlanId(val?.target?.value ?? val)}
            options={[
              { value: '', label: language === 'ar' ? 'غير محدد / استفسار عام' : language === 'fr' ? 'Indécis / Renseignement' : 'Undecided / Inquiry' },
              ...plans.map((p) => ({
                value: p.id,
                label: p.name,
                sublabel: `${p.durationDays} ${language === 'ar' ? 'يوم' : language === 'fr' ? 'jours' : 'days'} · ${p.price.toLocaleString()} DA`,
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
            onChange={(val) => setSource(val?.target?.value ?? val)}
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

        <div className="space-y-1">
          <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
            {t('modal_notes', language)}
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              language === 'ar'
                ? 'أهداف المشترك، تفضيلات الحصص، رغبة في حصة تجريبية...'
                : language === 'fr'
                ? 'Objectifs du prospect, créneaux souhaités, demande de séance d\'essai...'
                : 'Class preferences, goals, free trial session requested...'
            }
            style={{
              backgroundColor: 'var(--color-surface-bg)',
              borderColor: 'var(--color-border)',
              borderRadius: 'var(--radius-input)',
            }}
            className="w-full p-2.5 text-sm border focus:outline-none focus:border-[#C4785A] text-neutral-900 dark:text-white resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3">
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
            {t('action_save', language)}
          </AtriumButton>
        </div>
      </form>
    </Modal>
  );
};

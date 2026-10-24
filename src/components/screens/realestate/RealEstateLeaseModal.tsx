import React, { useState } from 'react';
import { Key, X } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { RealEstateProperty, RealEstateLease } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';

interface RealEstateLeaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: RealEstateProperty[];
  onSave: (lease: RealEstateLease) => void;
}

export const RealEstateLeaseModal: React.FC<RealEstateLeaseModalProps> = ({
  isOpen,
  onClose,
  properties,
  onSave,
}) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [startDate, setStartDate] = useState('2026-06-01');
  const [endDate, setEndDate] = useState('2027-05-31');
  const [monthlyRent, setMonthlyRent] = useState('180000');
  const [deposit, setDeposit] = useState('360000');
  const [frequency, setFrequency] = useState<'Monthly' | 'Quarterly' | 'Semiannual' | 'Annual'>('Annual');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prop = properties.find((p) => p.id === propertyId) || properties[0];
    if (!tenantName.trim() || !prop) {
      showToast('Veuillez renseigner le locataire et sélectionner un bien', 'error');
      return;
    }

    const created: RealEstateLease = {
      id: `lease_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_realestate',
      branchId: currentBranch?.id || 'branch_realestate_main',
      staffId: currentUser?.id || 'staff_01',
      propertyId: prop.id,
      propertyTitle: prop.title,
      tenantName: tenantName.trim(),
      tenantPhone: tenantPhone.trim(),
      startDate,
      endDate,
      monthlyRentDzd: parseFloat(monthlyRent) || 100000,
      securityDepositDzd: parseFloat(deposit) || 200000,
      agencyCommissionDzd: parseFloat(monthlyRent) || 100000,
      status: 'Active',
      paymentFrequency: frequency,
    };

    onSave(created);
    showToast(
      language === 'ar' ? 'تم تحرير عقد الكراء بنجاح' : 'Bail de location établi avec succès',
      'success'
    );
    onClose();
  };

  const propOptions = properties.map((p) => ({
    value: p.id,
    label: `${p.title} (${p.cityWilaya})`,
  }));

  const freqOptions = [
    { value: 'Monthly', label: language === 'ar' ? 'شهري' : 'Mensuel' },
    { value: 'Quarterly', label: language === 'ar' ? 'فصلي (3 أشهر)' : 'Trimestriel' },
    { value: 'Semiannual', label: language === 'ar' ? 'سداسي (6 أشهر)' : 'Semestriel' },
    { value: 'Annual', label: language === 'ar' ? 'سنوي (مسبق)' : 'Annuel d\'avance' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
              <Key size={16} />
            </div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
              {language === 'ar' ? 'تحرير عقد كراء جديد' : 'Nouveau Bail de Location'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <LabelSelect
            label={language === 'ar' ? 'العقار المؤجر' : 'Bien loué'}
            value={propertyId}
            onChange={setPropertyId}
            options={propOptions}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              label={language === 'ar' ? 'اسم المستأجر' : 'Locataire (Preneur)'}
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Ex: Anis Belhadj"
              required
            />
            <LabelInput
              label={language === 'ar' ? 'هاتف المستأجر' : 'Téléphone'}
              value={tenantPhone}
              onChange={(e) => setTenantPhone(e.target.value)}
              placeholder="0555..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              label={language === 'ar' ? 'تاريخ بداية العقد' : 'Date de début'}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <LabelInput
              label={language === 'ar' ? 'تاريخ نهاية العقد' : 'Date d\'échéance'}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabelInput
              label={language === 'ar' ? 'الكراء الشهري (د.ج)' : 'Loyer / mois (DA)'}
              type="number"
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(e.target.value)}
            />
            <LabelInput
              label={language === 'ar' ? 'مبلغ الضمان (Caution)' : 'Dépôt de garantie'}
              type="number"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
            />
            <LabelSelect
              label={language === 'ar' ? 'دورية الدفع' : 'Périodicité'}
              value={frequency}
              onChange={(val) => setFrequency(val as any)}
              options={freqOptions}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <AtriumButton variant="secondary" onClick={onClose}>
              {language === 'ar' ? 'إلغاء' : 'Annuler'}
            </AtriumButton>
            <AtriumButton type="submit" variant="primary" icon={<Key size={14} />}>
              {language === 'ar' ? 'تحرير العقد' : 'Établir le Contrat'}
            </AtriumButton>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Key, X } from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
} from '../../../services/store';
import { t } from '../../../utils/i18n';
import { RealEstateProperty, RealEstateLease } from '../../../types';
import { formatRealEstateSequentialCode } from '../../../utils/realEstateDepth';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { KineticModalShell } from '../../ui/kinetic';

interface RealEstateLeaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: RealEstateProperty[];
  onSave: (lease: RealEstateLease) => void;
  existingLeases?: RealEstateLease[];
}

export const RealEstateLeaseModal: React.FC<RealEstateLeaseModalProps> = ({
  isOpen,
  onClose,
  properties,
  onSave,
  existingLeases = [],
}) => {
  const { account, language, currentBusiness, currentBranch, currentUser } = useAtriumSelector(
    (s) => ({
      account: s.account,
      language: s.language,
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      currentUser: s.currentUser,
    }),
    shallowEqualObjects
  );
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [frequency, setFrequency] = useState('Annual');
  const [indexationFrequency, setIndexationFrequency] = useState<'None' | 'Annual' | 'Biennial'>('Annual');
  const [indexationRatePercent, setIndexationRatePercent] = useState('5');
  const [nextIndexationDate, setNextIndexationDate] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setPropertyId(properties[0]?.id || '');
    setTenantName('');
    setTenantPhone('');
    setStartDate('');
    setEndDate('');
    setMonthlyRent('');
    setDeposit('');
    setFrequency('Annual');
    setIndexationFrequency('Annual');
    setIndexationRatePercent('5');
    setNextIndexationDate('');
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prop = properties.find((p) => p.id === propertyId) || properties[0];
    if (!tenantName.trim() || !prop) {
      showToast('Veuillez renseigner le locataire et sélectionner un bien', 'error');
      return;
    }
    const parsedRent = parseFloat(monthlyRent);
    if (!Number.isFinite(parsedRent) || parsedRent <= 0) {
      showToast('Veuillez saisir un loyer mensuel valide', 'error');
      return;
    }
    const parsedDeposit = deposit.trim() ? parseFloat(deposit) || 0 : 0;
    const activeAccountId = (prop.accountId || currentBranch?.accountId || account?.id || '').trim();
    const activeBranchId = (currentBranch?.id || prop.branchId || '').trim();
    if (!activeAccountId || !activeBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', language),
        message: t('tenant_context_missing_msg', language),
      });
      return;
    }

    const leaseNumber = formatRealEstateSequentialCode(
      'BAIL',
      existingLeases.map((l) => l.leaseNumber),
      startDate ? Number(startDate.slice(0, 4)) || new Date().getFullYear() : new Date().getFullYear()
    );
    const parsedIdxRate = parseFloat(indexationRatePercent);

    onSave({
      id: `lease_${Date.now()}`,
      accountId: activeAccountId,
      businessId: currentBusiness?.id || prop.businessId || '',
      branchId: activeBranchId,
      staffId: currentUser?.id || '',
      leaseNumber,
      propertyId: prop.id,
      propertyTitle: prop.title,
      ownerName: prop.ownerName,
      tenantName: tenantName.trim(),
      tenantPhone: tenantPhone.trim(),
      startDate,
      endDate,
      monthlyRentDzd: parsedRent,
      securityDepositDzd: parsedDeposit,
      agencyCommissionDzd: parsedRent,
      status: 'Active',
      paymentFrequency: frequency,
      renewalCount: 0,
      indexationFrequency,
      indexationRatePercent: Number.isFinite(parsedIdxRate) && parsedIdxRate > 0 ? parsedIdxRate : undefined,
      nextIndexationDate: indexationFrequency !== 'None' && nextIndexationDate ? nextIndexationDate : undefined,
      indexationHistory: [],
    });
    onClose();
  };

  const propOptions = properties.map((p) => ({
    value: p.id,
    label: `${p.title} (${p.cityWilaya})`,
  }));

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      scrimClassName="bg-black/50"
      ariaLabel={language === 'ar' ? 'تحرير عقد كراء جديد' : 'Nouveau Bail de Location'}
    >
      <div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] w-full p-6 [--sq-stroke:var(--sq-stroke-pop)] space-y-5">
        <div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3">
          <div className="flex items-center gap-2">
            <div data-sq="ctl-sm" data-sq-border="none" className="w-8 h-8 bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold"><Key size={16} /></div>
            <h3 className="font-semibold t-label text-black dark:text-white">{language === 'ar' ? 'تحرير عقد كراء جديد' : 'Nouveau Bail de Location'}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" data-sq="ctl-sm" data-sq-border="none" className="w-8 h-8 flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <LabelSelect label={language === 'ar' ? 'العقار المؤجر' : 'Bien loué'} value={propertyId} onChange={setPropertyId} options={propOptions} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput label={language === 'ar' ? 'اسم المستأجر' : 'Locataire (Preneur)'} value={tenantName} onChange={setTenantName} placeholder="Ex: Anis Belhadj" required />
            <LabelInput label={language === 'ar' ? 'هاتف المستأجر' : 'Téléphone'} value={tenantPhone} onChange={setTenantPhone} placeholder="0555..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput label={language === 'ar' ? 'تاريخ بداية العقد' : 'Date de début'} type="date" value={startDate} onChange={setStartDate} />
            <LabelInput label={language === 'ar' ? 'تاريخ نهاية العقد' : "Date d'échéance"} type="date" value={endDate} onChange={setEndDate} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabelInput label={language === 'ar' ? 'الكراء الشهري (د.ج)' : 'Loyer / mois (DA)'} type="number" placeholder="180000" value={monthlyRent} onChange={setMonthlyRent} required />
            <LabelInput label={language === 'ar' ? 'مبلغ الضمان (Caution)' : 'Dépôt de garantie'} type="number" placeholder="360000" value={deposit} onChange={setDeposit} />
            <LabelSelect
              label={language === 'ar' ? 'دورية الدفع' : 'Périodicité'}
              value={frequency}
              onChange={setFrequency}
              options={[
                { value: 'Monthly', label: language === 'ar' ? 'شهري' : 'Mensuel' },
                { value: 'Quarterly', label: language === 'ar' ? 'فصلي (3 أشهر)' : 'Trimestriel' },
                { value: 'Semiannual', label: language === 'ar' ? 'سداسي (6 أشهر)' : 'Semestriel' },
                { value: 'Annual', label: language === 'ar' ? 'سنوي (مسبق)' : "Annuel d'avance" },
              ]}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabelSelect
              label={language === 'ar' ? 'مراجعة الإيجار' : 'Indexation Loyer'}
              value={indexationFrequency}
              onChange={(v) => setIndexationFrequency(v as 'None' | 'Annual' | 'Biennial')}
              options={[
                { value: 'Annual', label: language === 'ar' ? 'سنوية' : 'Annuelle' },
                { value: 'Biennial', label: language === 'ar' ? 'كل سنتين' : 'Biennale' },
                { value: 'None', label: language === 'ar' ? 'بدون' : 'Aucune' },
              ]}
            />
            <LabelInput
              label={language === 'ar' ? 'نسبة الزيادة (%)' : 'Taux Index (%)'}
              type="number"
              step="0.5"
              value={indexationRatePercent}
              onChange={setIndexationRatePercent}
            />
            <LabelInput
              label={language === 'ar' ? 'تاريخ المراجعة القادمة' : 'Prochaine Révision'}
              type="date"
              value={nextIndexationDate}
              onChange={setNextIndexationDate}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--atr-divider)]">
            <AtriumButton type="button" variant="secondary" onClick={onClose}>{language === 'ar' ? 'إلغاء' : 'Annuler'}</AtriumButton>
            <AtriumButton type="submit" variant="primary" icon={<Key size={14} />}>{language === 'ar' ? 'تحرير العقد' : 'Établir le Contrat'}</AtriumButton>
          </div>
        </form>
      </div>
    </KineticModalShell>
  );
};

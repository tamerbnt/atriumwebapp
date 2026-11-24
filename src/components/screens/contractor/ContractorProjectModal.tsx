import React, { useState, useEffect } from 'react';
import { HardHat, X } from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
} from '../../../services/store';
import { t } from '../../../utils/i18n';
import { ContractorProject } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { Button } from '@/atrium/core';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';

interface ContractorProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: ContractorProject) => void;
  initialData?: ContractorProject | null;
}

export const ContractorProjectModal: React.FC<ContractorProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
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
  const isAr = language === 'ar';

  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [contractAmount, setContractAmount] = useState('');
  const [retentionPercent, setRetentionPercent] = useState('5');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetEndDate, setTargetEndDate] = useState('');
  const [supervisorName, setSupervisorName] = useState('');
  const [status, setStatus] = useState<ContractorProject['status']>('InProgress');
  const [progressPercent, setProgressPercent] = useState('0');

  useEffect(() => {
    if (initialData) {
      setProjectName(initialData.projectName);
      setClientName(initialData.clientName);
      setSiteLocation(initialData.siteLocation);
      setContractAmount(String(initialData.contractAmountDzd));
      setRetentionPercent(String(initialData.retentionGuaranteePercent));
      setStartDate(initialData.startDate);
      setTargetEndDate(initialData.targetEndDate);
      setSupervisorName(initialData.supervisorName);
      setStatus(initialData.status);
      setProgressPercent(String(initialData.progressPercent));
    } else {
      setProjectName('');
      setClientName('');
      setSiteLocation('');
      setContractAmount('');
      setRetentionPercent('5');
      setStartDate(new Date().toISOString().split('T')[0]);
      setTargetEndDate('');
      setSupervisorName(currentUser?.fullName || '');
      setStatus('InProgress');
      setProgressPercent('0');
    }
  }, [initialData, isOpen, currentUser?.fullName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !clientName.trim()) {
      showToast(isAr ? 'يرجى إدخال اسم المشروع والعميل' : 'Veuillez saisir le nom du projet et client', 'error');
      return;
    }

    const amount = parseFloat(contractAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast(isAr ? 'يرجى إدخال مبلغ الصفقة' : 'Veuillez saisir un montant de marché valide', 'error');
      return;
    }

    const activeAccountId = (initialData?.accountId || currentBranch?.accountId || account?.id || '').trim();
    const activeBranchId = (initialData?.branchId || currentBranch?.id || '').trim();
    if (!activeAccountId || !activeBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', language),
        message: t('tenant_context_missing_msg', language),
      });
      return;
    }

    const retPct = parseFloat(retentionPercent) || 5;

    const payload: ContractorProject = {
      id: initialData?.id || `proj_${Date.now()}`,
      accountId: activeAccountId,
      businessId: currentBusiness?.id || currentBranch?.businessId || '',
      branchId: activeBranchId,
      staffId: currentUser?.id || '',
      projectCode: initialData?.projectCode || `CHANT-2026-${Math.floor(20 + Math.random() * 80)}`,
      projectName: projectName.trim(),
      clientName: clientName.trim(),
      siteLocation: siteLocation.trim() || 'Alger, Algérie',
      contractAmountDzd: amount,
      retentionGuaranteePercent: retPct,
      retentionAmountDzd: (amount * retPct) / 100,
      startDate,
      targetEndDate,
      supervisorName: supervisorName.trim(),
      progressPercent: parseInt(progressPercent, 10) || 0,
      status,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    onSave(payload);
  };

  return (
    <KineticModalShell isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-lg" zIndexClass="z-[9990]">
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto"
      >
          <div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3">
            <div className="flex items-center gap-2">
              <div
                data-sq="tile"
                data-sq-border="none"
                className="w-9 h-9 bg-orange-50 dark:bg-orange-950/40 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold shrink-0"
              >
                <HardHat size={20} />
              </div>
              <div>
                <h2 className="t-card font-semibold text-black dark:text-white">
                  {initialData
                    ? (isAr ? 'تعديل بيانات الورشة' : 'Modifier le Chantier')
                    : (isAr ? 'فتح ورشة عمل جديدة (Chantier)' : 'Nouveau Chantier & Marché BTP')}
                </h2>
              </div>
            </div>
            <button
              type="button"
              aria-label={isAr ? 'إغلاق' : 'Fermer'}
              onClick={onClose}
              className="p-2 rounded-full text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <LabelInput
            field="projectName"
            width="100%"
            height={40}
            corner={12}
            label={isAr ? 'اسم الورشة / المشروع *' : 'Intitulé du Projet / Chantier *'}
            placeholder="Ex: Construction Immeuble R+5 ou Aménagement VRD"
            value={projectName}
            onChange={setProjectName}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              field="clientName"
              width="100%"
              height={40}
              corner={12}
              label={isAr ? 'صاحب المشروع (العميل) *' : 'Maître d’Ouvrage (Client) *'}
              placeholder="Ex: SPA Maghreb Invest"
              value={clientName}
              onChange={setClientName}
              required
            />
            <LabelInput
              field="siteLocation"
              width="100%"
              height={40}
              corner={12}
              label={isAr ? 'موقع الورشة' : 'Localisation Chantier'}
              placeholder="Ex: Chéraga, Alger"
              value={siteLocation}
              onChange={setSiteLocation}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              field="contractAmount"
              width="100%"
              height={40}
              corner={12}
              label={isAr ? 'مبلغ الصفقة الإجمالي (دج)' : 'Montant du Marché (DZD)'}
              type="number"
              placeholder="45000000"
              value={contractAmount}
              onChange={setContractAmount}
              required
            />
            <LabelSelect
              field="retentionPercent"
              width="100%"
              height={40}
              corner={12}
              label={isAr ? 'نسبة الضمان (Retenue)' : 'Retenue de Garantie'}
              value={retentionPercent}
              onChange={setRetentionPercent}
              options={[
                { value: '5', label: '5% (Standard Marchés Publics)' },
                { value: '10', label: '10% (Privé / Sous-traitance)' },
                { value: '0', label: '0% (Sans Retenue)' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              field="startDate"
              width="100%"
              height={40}
              corner={12}
              label={isAr ? 'تاريخ الانطلاق' : 'Date d’Ordre de Service (ODS)'}
              type="date"
              value={startDate}
              onChange={setStartDate}
            />
            <LabelInput
              field="targetEndDate"
              width="100%"
              height={40}
              corner={12}
              label={isAr ? 'تاريخ التسليم المتوقع' : 'Délai Contractuel'}
              type="date"
              value={targetEndDate}
              onChange={setTargetEndDate}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              field="supervisorName"
              width="100%"
              height={40}
              corner={12}
              label={isAr ? 'رئيس الورشة / المهندس المشرف' : 'Chef de Chantier / Conducteur'}
              placeholder="Ex: Ing. Mourad Benali"
              value={supervisorName}
              onChange={setSupervisorName}
            />
            <LabelInput
              field="progressPercent"
              width="100%"
              height={40}
              corner={12}
              label={isAr ? 'نسبة الإنجاز (%)' : 'Avancement (%)'}
              type="number"
              min="0"
              max="100"
              value={progressPercent}
              onChange={setProgressPercent}
            />
          </div>

          <div>
            <label className="block t-cap font-medium text-black/65 dark:text-white/65 mb-1.5">
              {isAr ? 'الحالة' : 'Statut Chantier'}
            </label>
            <LiveSegmentedControl
              size="md"
              fullWidth
              value={status}
              onChange={(v) => setStatus(v as ContractorProject['status'])}
              options={[
                { value: 'InProgress', label: isAr ? 'قيد التنفيذ' : 'En Cours' },
                { value: 'ProvisionalHandover', label: isAr ? 'استلام مؤقت' : 'Réc. Provisoire' },
                { value: 'DefinitiveHandover', label: isAr ? 'استلام نهائي' : 'Réc. Définitive' },
              ]}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
            <Button type="button" tone="soft" size={40} onClick={onClose}>
              {isAr ? 'إلغاء' : 'Annuler'}
            </Button>
            <Button tone="accent" size={40} type="submit">
              {initialData ? (isAr ? 'حفظ التعديلات' : 'Enregistrer') : (isAr ? 'تأكيد التسجيل' : 'Créer le Chantier')}
            </Button>
          </div>
        </form>
      </div>
    </KineticModalShell>
  );
};

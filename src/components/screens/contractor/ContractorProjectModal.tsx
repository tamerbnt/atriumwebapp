import React, { useState, useEffect } from 'react';
import { HardHat, X } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { ContractorProject } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';

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
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';

  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [contractAmount, setContractAmount] = useState('45000000');
  const [retentionPercent, setRetentionPercent] = useState('5');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetEndDate, setTargetEndDate] = useState('2026-12-31');
  const [supervisorName, setSupervisorName] = useState('Ing. Mourad Benali');
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
      setContractAmount('45000000');
      setRetentionPercent('5');
      setStartDate(new Date().toISOString().split('T')[0]);
      setTargetEndDate('2026-12-31');
      setSupervisorName('Ing. Mourad Benali');
      setStatus('InProgress');
      setProgressPercent('0');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !clientName.trim()) {
      showToast(isAr ? 'يرجى إدخال اسم المشروع والعميل' : 'Veuillez saisir le nom du projet et client', 'error');
      return;
    }

    const amount = parseFloat(contractAmount) || 0;
    const retPct = parseFloat(retentionPercent) || 5;

    const payload: ContractorProject = {
      id: initialData?.id || `proj_${Date.now()}`,
      accountId: initialData?.accountId || 'acc_01',
      businessId: currentBusiness?.id || 'biz_contractor',
      branchId: currentBranch?.id || 'branch_contractor_main',
      staffId: currentUser?.id || 'staff_01',
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
    showToast(
      initialData
        ? (isAr ? 'تم تحديث ورشة المشروع بنجاح' : 'Chantier mis à jour avec succès')
        : (isAr ? 'تم فتح ورشة المشروع وتسجيل عقد المقاولة' : 'Chantier créé et contrat enregistré'),
      'success'
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold">
              <HardHat size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                {initialData
                  ? (isAr ? 'تعديل بيانات الورشة' : 'Modifier le Chantier')
                  : (isAr ? 'فتح ورشة عمل جديدة (Chantier)' : 'Nouveau Chantier & Marché BTP')}
              </h2>
              <p className="text-xs text-neutral-500">
                {isAr ? 'تسجيل صفقة المقاولة والضمانات البنكية' : 'Création de fiche projet, montant du marché et retenue'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <LabelInput
            label={isAr ? 'اسم الورشة / المشروع *' : 'Intitulé du Projet / Chantier *'}
            placeholder="Ex: Construction Immeuble R+5 ou Aménagement VRD"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'صاحب المشروع (العميل) *' : 'Maître d’Ouvrage (Client) *'}
              placeholder="Ex: SPA Maghreb Invest"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
            <LabelInput
              label={isAr ? 'موقع الورشة' : 'Localisation Chantier'}
              placeholder="Ex: Chéraga, Alger"
              value={siteLocation}
              onChange={(e) => setSiteLocation(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'مبلغ الصفقة الإجمالي (دج)' : 'Montant du Marché (DZD)'}
              type="number"
              value={contractAmount}
              onChange={(e) => setContractAmount(e.target.value)}
              required
            />
            <LabelSelect
              label={isAr ? 'نسبة الضمان (Retenue)' : 'Retenue de Garantie'}
              value={retentionPercent}
              onChange={(e) => setRetentionPercent(e.target.value)}
              options={[
                { value: '5', label: '5% (Standard Marchés Publics)' },
                { value: '10', label: '10% (Privé / Sous-traitance)' },
                { value: '0', label: '0% (Sans Retenue)' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'تاريخ الانطلاق' : 'Date d’Ordre de Service (ODS)'}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <LabelInput
              label={isAr ? 'تاريخ التسليم المتوقع' : 'Délai Contractuel'}
              type="date"
              value={targetEndDate}
              onChange={(e) => setTargetEndDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'رئيس الورشة / المهندس المشرف' : 'Chef de Chantier / Conducteur'}
              placeholder="Ex: Ing. Mourad Benali"
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
            />
            <LabelSelect
              label={isAr ? 'الحالة' : 'Statut Chantier'}
              value={status}
              onChange={(e) => setStatus(e.target.value as ContractorProject['status'])}
              options={[
                { value: 'InProgress', label: 'En Cours' },
                { value: 'ProvisionalHandover', label: 'Réception Provisoire' },
                { value: 'DefinitiveHandover', label: 'Réception Définitive' },
              ]}
            />
          </div>

          <LabelInput
            label={isAr ? 'نسبة الإنجاز (%)' : 'Avancement (%)'}
            type="number"
            min="0"
            max="100"
            value={progressPercent}
            onChange={(e) => setProgressPercent(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <AtriumButton variant="ghost" size="sm" onClick={onClose}>
              {isAr ? 'إلغاء' : 'Annuler'}
            </AtriumButton>
            <AtriumButton variant="primary" size="sm" type="submit">
              {initialData ? (isAr ? 'حفظ التعديلات' : 'Enregistrer') : (isAr ? 'تأكيد التسجيل' : 'Créer le Chantier')}
            </AtriumButton>
          </div>
        </form>
      </div>
    </div>
  );
};

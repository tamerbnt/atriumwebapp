import React, { useState } from 'react';
import { Briefcase, X } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { LegalMatter } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';

interface LegalMatterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (matter: LegalMatter) => void;
  matterToEdit?: LegalMatter | null;
}

export const LegalMatterModal: React.FC<LegalMatterModalProps> = ({
  isOpen,
  onClose,
  onSave,
  matterToEdit,
}) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const [title, setTitle] = useState(matterToEdit?.title || '');
  const [category, setCategory] = useState<'Commercial' | 'Civil' | 'Penal' | 'Labor' | 'Administrative' | 'RealEstate'>(matterToEdit?.category || 'Commercial');
  const [clientName, setClientName] = useState(matterToEdit?.clientName || '');
  const [clientPhone, setClientPhone] = useState(matterToEdit?.clientPhone || '');
  const [adverseParty, setAdverseParty] = useState(matterToEdit?.adversePartyName || '');
  const [jurisdiction, setJurisdiction] = useState(matterToEdit?.courtJurisdiction || 'Tribunal de Sidi M\'Hamed');
  const [retainer, setRetainer] = useState(matterToEdit ? String(matterToEdit.retainerAmountDzd) : '200000');
  const [hearingDate, setHearingDate] = useState(matterToEdit?.nextHearingDate || '2026-06-15');

  React.useEffect(() => {
    if (matterToEdit) {
      setTitle(matterToEdit.title);
      setCategory(matterToEdit.category);
      setClientName(matterToEdit.clientName);
      setClientPhone(matterToEdit.clientPhone || '');
      setAdverseParty(matterToEdit.adversePartyName || '');
      setJurisdiction(matterToEdit.courtJurisdiction || 'Tribunal de Sidi M\'Hamed');
      setRetainer(String(matterToEdit.retainerAmountDzd || 200000));
      setHearingDate(matterToEdit.nextHearingDate || '2026-06-15');
    } else {
      setTitle('');
      setCategory('Commercial');
      setClientName('');
      setClientPhone('');
      setAdverseParty('');
      setJurisdiction('Tribunal de Sidi M\'Hamed');
      setRetainer('200000');
      setHearingDate('2026-06-15');
    }
  }, [matterToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientName.trim()) {
      showToast('Veuillez renseigner le titre du dossier et le client', 'error');
      return;
    }

    const saved: LegalMatter = {
      id: matterToEdit ? matterToEdit.id : `mat_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_legal',
      branchId: currentBranch?.id || 'branch_legal_main',
      staffId: currentUser?.id || 'staff_01',
      matterNumber: matterToEdit ? matterToEdit.matterNumber : `DOS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      title: title.trim(),
      category,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      adversePartyName: adverseParty.trim() || undefined,
      courtJurisdiction: jurisdiction.trim(),
      assignedLawyer: matterToEdit?.assignedLawyer || 'Maître Titulaire',
      retainerAmountDzd: parseFloat(retainer) || 150000,
      trustEscrowBalanceDzd: matterToEdit?.trustEscrowBalanceDzd || 0,
      status: matterToEdit?.status || 'Active',
      nextHearingDate: hearingDate,
      createdAt: matterToEdit?.createdAt || new Date().toISOString(),
    };

    onSave(saved);

    showToast(
      language === 'ar' ? 'تم فتح ملف القضية بنجاح' : 'Dossier juridique ouvert avec succès',
      'success'
    );
    onClose();
  };

  const catOptions = [
    { value: 'Commercial', label: language === 'ar' ? 'تجاري ومنازعات أعمال' : 'Commercial & Sociétés' },
    { value: 'Civil', label: language === 'ar' ? 'مدني وعقارات' : 'Civil & Immobilier' },
    { value: 'Labor', label: language === 'ar' ? 'اجتماعي وعمل' : 'Droit du Travail' },
    { value: 'Penal', label: language === 'ar' ? 'جزائي وجنائي' : 'Pénal' },
    { value: 'Administrative', label: language === 'ar' ? 'إداري وصفقات عمومية' : 'Administratif & Marchés' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
              <Briefcase size={16} />
            </div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
              {language === 'ar' ? 'فتح ملف قضية جديد' : 'Nouveau Dossier Juridique'}
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
          <LabelInput
            label={language === 'ar' ? 'موضوع القضية أو النزاع' : 'Intitulé de l\'affaire'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Recouvrement créance commerciale..."
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelSelect
              label={language === 'ar' ? 'الفرع القانوني' : 'Branche du droit'}
              value={category}
              onChange={(val) => setCategory(val as any)}
              options={catOptions}
            />
            <LabelInput
              label={language === 'ar' ? 'الجهة القضائية المختصة' : 'Juridiction compétente'}
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              placeholder="Tribunal de Commerce..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              label={language === 'ar' ? 'الموكل (المدعي أو المدعى عليه)' : 'Client mandant'}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="SARL Atlas..."
              required
            />
            <LabelInput
              label={language === 'ar' ? 'هاتف الموكل' : 'Téléphone'}
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="0555..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              label={language === 'ar' ? 'الخصم / الطرف المقابل' : 'Partie adverse'}
              value={adverseParty}
              onChange={(e) => setAdverseParty(e.target.value)}
              placeholder="SPA BTP..."
            />
            <LabelInput
              label={language === 'ar' ? 'أتعاب التوكيل (د.ج)' : 'Provision / Honoraires (DA)'}
              type="number"
              value={retainer}
              onChange={(e) => setRetainer(e.target.value)}
            />
          </div>

          <LabelInput
            label={language === 'ar' ? 'تاريخ أول جلسة' : 'Date de la première audience'}
            type="date"
            value={hearingDate}
            onChange={(e) => setHearingDate(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <AtriumButton variant="secondary" onClick={onClose}>
              {language === 'ar' ? 'إلغاء' : 'Annuler'}
            </AtriumButton>
            <AtriumButton type="submit" variant="primary" icon={<Briefcase size={14} />}>
              {language === 'ar' ? 'فتح الملف' : 'Créer le Dossier'}
            </AtriumButton>
          </div>
        </form>
      </div>
    </div>
  );
};

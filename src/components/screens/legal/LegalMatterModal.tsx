import React, { useState, useEffect } from 'react';
import { X, Scale } from 'lucide-react';
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

const extractStr = (v: unknown): string => {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    const obj = v as { target?: { value?: unknown }; value?: unknown };
    if (obj.target?.value !== undefined) return String(obj.target.value);
    if (obj.value !== undefined) return String(obj.value);
  }
  return String(v ?? '');
};

export const LegalMatterModal: React.FC<LegalMatterModalProps> = ({
  isOpen,
  onClose,
  onSave,
  matterToEdit,
}) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';

  const [title, setTitle] = useState(matterToEdit?.title || '');
  const [titleAr, setTitleAr] = useState(matterToEdit?.titleAr || '');
  const [category, setCategory] = useState<LegalMatter['category']>(
    matterToEdit?.category || 'Commercial'
  );
  const [clientName, setClientName] = useState(matterToEdit?.clientName || '');
  const [clientNameAr, setClientNameAr] = useState(matterToEdit?.clientNameAr || '');
  const [clientPhone, setClientPhone] = useState(matterToEdit?.clientPhone || '');
  const [clientNinOrNif, setClientNinOrNif] = useState(matterToEdit?.clientNinOrNif || '');
  const [adverseParty, setAdverseParty] = useState(matterToEdit?.adversePartyName || '');
  const [jurisdiction, setJurisdiction] = useState(
    matterToEdit?.courtJurisdiction || "Tribunal de Sidi M'Hamed"
  );
  const [chamber, setChamber] = useState(matterToEdit?.chamber || 'Chambre Commerciale 2');
  const [retainer, setRetainer] = useState(
    matterToEdit ? String(matterToEdit.retainerAmountDzd) : '200000'
  );
  const [hearingDate, setHearingDate] = useState(matterToEdit?.nextHearingDate || '2026-06-15');
  const [notes, setNotes] = useState(matterToEdit?.notes || '');

  useEffect(() => {
    if (matterToEdit) {
      setTitle(matterToEdit.title);
      setTitleAr(matterToEdit.titleAr || '');
      setCategory(matterToEdit.category);
      setClientName(matterToEdit.clientName);
      setClientNameAr(matterToEdit.clientNameAr || '');
      setClientPhone(matterToEdit.clientPhone || '');
      setClientNinOrNif(matterToEdit.clientNinOrNif || '');
      setAdverseParty(matterToEdit.adversePartyName || '');
      setJurisdiction(matterToEdit.courtJurisdiction || "Tribunal de Sidi M'Hamed");
      setChamber(matterToEdit.chamber || 'Chambre Commerciale 2');
      setRetainer(String(matterToEdit.retainerAmountDzd || 200000));
      setHearingDate(matterToEdit.nextHearingDate || '2026-06-15');
      setNotes(matterToEdit.notes || '');
    } else {
      setTitle('');
      setTitleAr('');
      setCategory('Commercial');
      setClientName('');
      setClientNameAr('');
      setClientPhone('');
      setClientNinOrNif('');
      setAdverseParty('');
      setJurisdiction("Tribunal de Sidi M'Hamed");
      setChamber('Chambre Commerciale 2');
      setRetainer('200000');
      setHearingDate('2026-06-15');
      setNotes('');
    }
  }, [matterToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientName.trim()) {
      showToast(
        isAr
          ? 'يرجى إدخال عنوان القضية واسم الموكل'
          : 'Veuillez renseigner le titre du dossier et le client',
        'error'
      );
      return;
    }

    onSave({
      id: matterToEdit ? matterToEdit.id : `mat_${Date.now()}`,
      accountId: matterToEdit?.accountId || 'acc_01',
      businessId: matterToEdit?.businessId || currentBusiness?.id || 'biz_legal',
      branchId: matterToEdit?.branchId || currentBranch?.id || 'branch_legal_main',
      staffId: matterToEdit?.staffId || currentUser?.id || 'staff_01',
      matterNumber: matterToEdit
        ? matterToEdit.matterNumber
        : `DOS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      title: title.trim(),
      titleAr: titleAr.trim() || undefined,
      category,
      clientName: clientName.trim(),
      clientNameAr: clientNameAr.trim() || undefined,
      clientPhone: clientPhone.trim(),
      clientNinOrNif: clientNinOrNif.trim() || undefined,
      adversePartyName: adverseParty.trim() || undefined,
      courtJurisdiction: jurisdiction.trim(),
      chamber: chamber.trim(),
      assignedLawyer: matterToEdit?.assignedLawyer || 'Maître Y. Cherif (Avocat à la Cour)',
      retainerAmountDzd: parseFloat(retainer) || 150000,
      trustEscrowBalanceDzd: matterToEdit?.trustEscrowBalanceDzd || 0,
      status: matterToEdit?.status || 'Active',
      nextHearingDate: hearingDate,
      notes: notes.trim() || undefined,
      createdAt: matterToEdit?.createdAt || new Date().toISOString(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="sq-elev-pop max-w-xl w-full">
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-[#262422] w-full p-6 [--sq-stroke:var(--sq-stroke-pop)] space-y-5 max-h-[90vh] overflow-y-auto"
        >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
          <div className="flex items-center gap-2">
            <div
              data-sq="tile"
              data-sq-border="none"
              className="w-9 h-9 bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center"
            >
              <Scale size={18} />
            </div>
            <div>
              <h2 className="t-card font-semibold text-black dark:text-white">
                {matterToEdit
                  ? isAr
                    ? 'تعديل ملف القضية'
                    : 'Modifier le Dossier Juridique'
                  : isAr
                  ? 'فتح ملف قضية جديدة'
                  : 'Ouverture de Dossier Juridique'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            data-no-liquid="true"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق' : 'Fermer'}
            className="p-2 rounded-full text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 t-cap">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'عنوان القضية (فرنسية)' : 'Intitulé du Dossier (Français)'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Recouvrement créance SARL Atlas c/ BTP"
              required
            />
            <LabelInput
              label={isAr ? 'عنوان القضية (عربية - إلزامي للمحكمة)' : 'Intitulé en Arabe (Tribunal)'}
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              placeholder="مثال: تحصيل دين تجاري ضد ش.ذ.أ"
              className="text-right"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LabelSelect
              label={isAr ? 'طبيعة النزاع القضائي' : 'Branche du Droit'}
              value={category}
              onChange={(v) => setCategory(extractStr(v) as LegalMatter['category'])}
              options={[
                { value: 'Commercial', label: isAr ? 'تجاري ومنازعات أعمال' : 'Commercial & Sociétés' },
                { value: 'Civil', label: isAr ? 'مدني وعقارات' : 'Civil & Immobilier' },
                { value: 'Labor', label: isAr ? 'اجتماعي وعمل' : 'Droit du Travail' },
                { value: 'Penal', label: isAr ? 'جزائي وجنائي' : 'Pénal' },
                { value: 'Administrative', label: isAr ? 'إداري وصفقات عمومية' : 'Administratif & Marchés' },
              ]}
            />
            <LabelInput
              label={isAr ? 'المبلغ المبدئي للأتعاب (دج)' : "Convention d'Honoraires (DZD)"}
              type="number"
              value={retainer}
              onChange={(e) => setRetainer(e.target.value)}
              required
            />
          </div>

          <div
            data-sq="ctl"
            data-sq-border="none"
            className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] space-y-3"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <LabelInput
                label={isAr ? 'اسم الموكل (فرنسية)' : 'Nom du Client (Français)'}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="ex: SARL Atlas"
                required
              />
              <LabelInput
                label={isAr ? 'اسم الموكل (عربية)' : 'Nom du Client (Arabe)'}
                value={clientNameAr}
                onChange={(e) => setClientNameAr(e.target.value)}
                placeholder="مثال: شركة أطلس ذ.م.م"
                className="text-right"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <LabelInput
                label={isAr ? 'الهاتف' : 'Téléphone'}
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="0555 00 00 00"
              />
              <LabelInput
                label={isAr ? 'الرقم التعريفي الوطني (NIN/NIF)' : 'Identifiant National (NIN 18 / NIF 15)'}
                value={clientNinOrNif}
                onChange={(e) => setClientNinOrNif(e.target.value)}
                placeholder="197516010045678912"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'الطرف الخصم' : 'Partie Adverse'}
              value={adverseParty}
              onChange={(e) => setAdverseParty(e.target.value)}
              placeholder="ex: SPA BTP Méditerranée"
            />
            <LabelInput
              label={isAr ? 'المحكمة المختصة' : 'Juridiction / Tribunal'}
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'الغرفة أو القسم' : 'Chambre / Section'}
              value={chamber}
              onChange={(e) => setChamber(e.target.value)}
            />
            <LabelInput
              type="date"
              label={isAr ? 'تاريخ الجلسة القادمة' : 'Prochaine Audience'}
              value={hearingDate}
              onChange={(e) => setHearingDate(e.target.value)}
            />
          </div>

          <LabelInput
            label={isAr ? 'ملاحظات وتوجيهات الاستراتيجية القانونية' : 'Notes & Stratégie Juridique'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Éléments clés, pièces manquantes..."
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
            <AtriumButton variant="secondary" onClick={onClose} type="button">
              {isAr ? 'إلغاء' : 'Annuler'}
            </AtriumButton>
            <AtriumButton variant="primary" type="submit">
              {matterToEdit
                ? isAr
                  ? 'حفظ التعديلات'
                  : 'Enregistrer Modifications'
                : isAr
                ? 'فتح وتوثيق الملف'
                : 'Ouvrir le Dossier'}
            </AtriumButton>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

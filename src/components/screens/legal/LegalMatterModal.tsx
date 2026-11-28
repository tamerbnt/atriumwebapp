import React, { useState, useEffect, useMemo } from 'react';
import { X, Scale, AlertTriangle, Shield, Globe } from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
} from '../../../services/store';
import { t } from '../../../utils/i18n';
import {
  LegalClientEntity,
  LegalConfidentialityLevel,
  LegalMatter,
  NotaryDeed,
} from '../../../types';
import {
  LegalCabinetRoleKey,
  buildLegalPortalTokenAndUrl,
  detectLegalConflictOfInterest,
} from '../../../utils/legalDepth';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';

interface LegalMatterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (matter: LegalMatter) => void;
  matterToEdit?: LegalMatter | null;
  existingMatters?: LegalMatter[];
  existingClients?: LegalClientEntity[];
  existingDeeds?: NotaryDeed[];
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

const CABINET_ROLE_OPTIONS: Array<{ id: LegalCabinetRoleKey; labelFr: string; labelAr: string }> = [
  { id: 'avocat_associe', labelFr: 'Avocat Associé', labelAr: 'محامي شريك' },
  { id: 'notaire_titulaire', labelFr: 'Notaire Titulaire', labelAr: 'موثق' },
  { id: 'expert_comptable', labelFr: 'Expert Comptable', labelAr: 'خبير محاسب' },
  { id: 'secretaire_caisse', labelFr: 'Secrétaire Caisse', labelAr: 'أمانة الصندوق' },
];

export const LegalMatterModal: React.FC<LegalMatterModalProps> = ({
  isOpen,
  onClose,
  onSave,
  matterToEdit,
  existingMatters = [],
  existingClients = [],
  existingDeeds = [],
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
    matterToEdit ? String(matterToEdit.retainerAmountDzd) : ''
  );
  const [hearingDate, setHearingDate] = useState(matterToEdit?.nextHearingDate || '');
  const [notes, setNotes] = useState(matterToEdit?.notes || '');
  const [confidentialityLevel, setConfidentialityLevel] = useState<LegalConfidentialityLevel>(
    matterToEdit?.confidentialityLevel || 'Internal'
  );
  const [allowedRoles, setAllowedRoles] = useState<LegalCabinetRoleKey[]>(
    (matterToEdit?.allowedRoles as LegalCabinetRoleKey[] | undefined) || ['avocat_associe']
  );
  const [isArbitration, setIsArbitration] = useState<boolean>(
    Boolean(matterToEdit?.isArbitration)
  );
  const [portalEnabled, setPortalEnabled] = useState<boolean>(
    Boolean(matterToEdit?.portalEnabled)
  );
  const [conflictOverrideReason, setConflictOverrideReason] = useState<string>(
    matterToEdit?.conflictOverrideReason || ''
  );

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
      setRetainer(matterToEdit.retainerAmountDzd != null ? String(matterToEdit.retainerAmountDzd) : '');
      setHearingDate(matterToEdit.nextHearingDate || '');
      setNotes(matterToEdit.notes || '');
      setConfidentialityLevel(matterToEdit.confidentialityLevel || 'Internal');
      setAllowedRoles(
        (matterToEdit.allowedRoles as LegalCabinetRoleKey[] | undefined) || ['avocat_associe']
      );
      setIsArbitration(Boolean(matterToEdit.isArbitration));
      setPortalEnabled(Boolean(matterToEdit.portalEnabled));
      setConflictOverrideReason(matterToEdit.conflictOverrideReason || '');
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
      setRetainer('');
      setHearingDate('');
      setNotes('');
      setConfidentialityLevel('Internal');
      setAllowedRoles(['avocat_associe']);
      setIsArbitration(false);
      setPortalEnabled(false);
      setConflictOverrideReason('');
    }
  }, [matterToEdit, isOpen]);

  const conflictResult = useMemo(
    () =>
      detectLegalConflictOfInterest(
        {
          matterId: matterToEdit?.id,
          clientName,
          adversePartyName: adverseParty,
          clientNinOrNif,
          clientPhone,
        },
        existingMatters,
        existingClients,
        existingDeeds
      ),
    [
      clientName,
      clientNinOrNif,
      adverseParty,
      matterToEdit?.id,
      existingMatters,
      existingClients,
      existingDeeds,
    ]
  );

  const toggleAllowedRole = (role: LegalCabinetRoleKey) => {
    setAllowedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

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

    const parsedRetainer = parseFloat(retainer);
    if (!Number.isFinite(parsedRetainer) || parsedRetainer < 0) {
      showToast(
        isAr ? 'يرجى إدخال مبلغ الأتعاب' : "Veuillez saisir un montant d'honoraires valide",
        'error'
      );
      return;
    }

    if (conflictResult.hasConflict && !conflictOverrideReason.trim()) {
      showToast(
        isAr
          ? 'تضارب مصالح محتمل: يرجى تبرير التجاوز المهني كتابياً'
          : 'Conflit d’intérêts détecté : veuillez saisir le motif de dérogation motivée',
        'error'
      );
      return;
    }

    const activeAccountId = (matterToEdit?.accountId || currentBranch?.accountId || account?.id || '').trim();
    const activeBranchId = (matterToEdit?.branchId || currentBranch?.id || '').trim();
    if (!activeAccountId || !activeBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', language),
        message: t('tenant_context_missing_msg', language),
      });
      return;
    }

    const matterId = matterToEdit ? matterToEdit.id : `mat_${Date.now()}`;
    const matterNumber = matterToEdit
      ? matterToEdit.matterNumber
      : `DOS-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const clientPortalToken = portalEnabled
      ? matterToEdit?.clientPortalToken || buildLegalPortalTokenAndUrl(matterId, matterNumber).token
      : undefined;

    onSave({
      id: matterId,
      accountId: activeAccountId,
      businessId: matterToEdit?.businessId || currentBusiness?.id || currentBranch?.businessId || '',
      branchId: activeBranchId,
      staffId: matterToEdit?.staffId || currentUser?.id || '',
      matterNumber,
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
      assignedLawyer: matterToEdit?.assignedLawyer || currentUser?.fullName || '',
      retainerAmountDzd: parsedRetainer,
      trustEscrowBalanceDzd: matterToEdit?.trustEscrowBalanceDzd || 0,
      status: matterToEdit?.status || 'Active',
      nextHearingDate: hearingDate,
      notes: notes.trim() || undefined,
      confidentialityLevel,
      allowedRoles:
        confidentialityLevel === 'Restricted' || confidentialityLevel === 'SecretDefense'
          ? allowedRoles.length > 0
            ? allowedRoles
            : ['avocat_associe']
          : undefined,
      isArbitration,
      portalEnabled,
      clientPortalToken,
      conflictStatus: conflictResult.hasConflict ? 'overridden' : 'clear',
      conflictCheckedAt: new Date().toISOString(),
      conflictOverrideReason: conflictResult.hasConflict ? conflictOverrideReason.trim() : undefined,
      createdAt: matterToEdit?.createdAt || new Date().toISOString(),
    });

    onClose();
  };

  return (
    <KineticModalShell isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-xl" zIndexClass="z-[9990]">
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
              onChange={setTitle}
              placeholder="ex: Recouvrement créance SARL Atlas c/ BTP"
              required
            />
            <LabelInput
              label={isAr ? 'عنوان القضية (عربية - إلزامي للمحكمة)' : 'Intitulé en Arabe (Tribunal)'}
              value={titleAr}
              onChange={setTitleAr}
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
              placeholder="200000"
              value={retainer}
              onChange={setRetainer}
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
                onChange={setClientName}
                placeholder="ex: SARL Atlas"
                required
              />
              <LabelInput
                label={isAr ? 'اسم الموكل (عربية)' : 'Nom du Client (Arabe)'}
                value={clientNameAr}
                onChange={setClientNameAr}
                placeholder="مثال: شركة أطلس ذ.م.م"
                className="text-right"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <LabelInput
                label={isAr ? 'الهاتف' : 'Téléphone'}
                value={clientPhone}
                onChange={setClientPhone}
                placeholder="0555 00 00 00"
              />
              <LabelInput
                label={isAr ? 'الرقم التعريفي الوطني (NIN/NIF)' : 'Identifiant National (NIN 18 / NIF 15)'}
                value={clientNinOrNif}
                onChange={setClientNinOrNif}
                placeholder="197516010045678912"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'الطرف الخصم' : 'Partie Adverse'}
              value={adverseParty}
              onChange={setAdverseParty}
              placeholder="ex: SPA BTP Méditerranée"
            />
            <LabelInput
              label={isAr ? 'المحكمة المختصة' : 'Juridiction / Tribunal'}
              value={jurisdiction}
              onChange={setJurisdiction}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'الغرفة أو القسم' : 'Chambre / Section'}
              value={chamber}
              onChange={setChamber}
            />
            <LabelInput
              type="date"
              label={isAr ? 'تاريخ الجلسة القادمة' : 'Prochaine Audience'}
              value={hearingDate}
              onChange={setHearingDate}
            />
          </div>

          <LabelInput
            label={isAr ? 'ملاحظات وتوجيهات الاستراتيجية القانونية' : 'Notes & Stratégie Juridique'}
            value={notes}
            onChange={setNotes}
            placeholder="Éléments clés, pièces manquantes..."
          />

          <div
            data-sq="ctl"
            data-sq-border="none"
            className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] space-y-3"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-black dark:text-white">
              <Shield size={14} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
              <span>{isAr ? 'السرية، التحكيم وبوابة الموكل' : 'Confidentialité, Arbitrage & Portail Client'}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
              <LabelSelect
                label={isAr ? 'مستوى السرية' : 'Niveau de Confidentialité'}
                value={confidentialityLevel}
                onChange={(v) => setConfidentialityLevel(extractStr(v) as LegalConfidentialityLevel)}
                options={[
                  { value: 'PublicClient', label: isAr ? 'عام للموكل (Portail)' : 'PublicClient (Portail Client)' },
                  { value: 'Internal', label: isAr ? 'داخلي بالمكتب' : 'Internal (Cabinet)' },
                  { value: 'Restricted', label: isAr ? 'مقيد لأدوار محددة' : 'Restricted (Rôles autorisés)' },
                  { value: 'SecretDefense', label: isAr ? 'سر الدفاع المهني' : 'SecretDefense (Secret Défense)' },
                  { value: 'NotarialMinute', label: isAr ? 'أصل توثيقي' : 'NotarialMinute (Minute Notariale)' },
                ]}
              />

              <div className="flex flex-col gap-2 pb-1">
                <label className="inline-flex items-center gap-2 text-xs text-black/80 dark:text-white/85 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isArbitration}
                    onChange={(e) => setIsArbitration(e.target.checked)}
                    className="rounded border-stone-300 text-[#BF431F]"
                  />
                  <span>{isAr ? 'ملف تحكيم تجاري / دولي' : 'Procédure Arbitrale (CCI / CACI)'}</span>
                </label>

                <label className="inline-flex items-center gap-2 text-xs text-black/80 dark:text-white/85 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={portalEnabled}
                    onChange={(e) => setPortalEnabled(e.target.checked)}
                    className="rounded border-stone-300 text-[#BF431F]"
                  />
                  <span className="inline-flex items-center gap-1">
                    <Globe size={12} />
                    {isAr ? 'تفعيل رابط متابعة الموكل' : 'Activer Lien Portail Client'}
                  </span>
                </label>
              </div>
            </div>

            {(confidentialityLevel === 'Restricted' || confidentialityLevel === 'SecretDefense') && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-medium text-black/65 dark:text-white/65">
                  {isAr ? 'الأدوار المخولة بالاطلاع :' : 'Rôles autorisés à consulter ce dossier :'}
                </div>
                <div className="flex flex-wrap gap-3">
                  {CABINET_ROLE_OPTIONS.map((roleOpt) => (
                    <label
                      key={roleOpt.id}
                      className="inline-flex items-center gap-1.5 text-xs text-black/80 dark:text-white/80 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={allowedRoles.includes(roleOpt.id)}
                        onChange={() => toggleAllowedRole(roleOpt.id)}
                        className="rounded border-stone-300"
                      />
                      <span>{isAr ? roleOpt.labelAr : roleOpt.labelFr}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {conflictResult.hasConflict && (
            <div
              data-testid="legal-conflict-warning"
              data-sq="card"
              className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-200 space-y-2.5"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <div className="space-y-1">
                  <div className="font-semibold text-xs">
                    {isAr
                      ? 'تنبيه تضارب المصالح المهنية'
                      : 'Alerte Conflit d’Intérêts Déontologique'}
                  </div>
                  <ul className="text-[11px] space-y-0.5 list-disc list-inside">
                    {conflictResult.matches.map((match, idx) => (
                      <li key={`${match.reference}_${idx}`}>
                        {match.reference} · {match.reason} ({match.matchedField})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <LabelInput
                label={
                  isAr
                    ? 'مبرر التجاوز المهني (إلزامي للحفظ) *'
                    : 'Motif de dérogation motivée (Obligatoire) *'
                }
                value={conflictOverrideReason}
                onChange={setConflictOverrideReason}
                placeholder={
                  isAr
                    ? 'مثال: موافقة خطية من الموكلين أو نزاع منفصل غير متعارض'
                    : 'Ex: Renonciation écrite des parties / Litige distinct sans lien'
                }
                required
              />
            </div>
          )}

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
    </KineticModalShell>
  );
};

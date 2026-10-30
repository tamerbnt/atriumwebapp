import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  Scale,
  ShieldCheck,
  Building2,
  X,
  Check,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../services/store';
import { Modal } from '../ui/Modal';
import { AtriumButton } from '../ui/AtriumButton';
import { LabelInput } from '../ui/LabelInput';
import { LabelSelect } from '../ui/LabelSelect';
import {
  calculateCPCADeadline,
  CPCARecourseType,
  DomicileCategory,
} from '../../utils/legalRules';
import { CPCADeadline, LegalMatter } from '../../types';

interface CpcaDeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  matters: LegalMatter[];
  onSaveDeadline: (deadline: CPCADeadline) => void;
}

export const CpcaDeadlineModal: React.FC<CpcaDeadlineModalProps> = ({
  isOpen,
  onClose,
  matters,
  onSaveDeadline,
}) => {
  const { language, networkMode } = useAtriumStore();
  const isAr = language === 'ar';

  const [selectedMatterId, setSelectedMatterId] = useState(matters[0]?.id || '');
  const [caseNumber, setCaseNumber] = useState('26/01482');
  const [courtJurisdiction, setCourtJurisdiction] = useState('Tribunal de Sidi M\'Hamed');
  const [chamber, setChamber] = useState('Chambre Commerciale 2');
  const [recourseType, setRecourseType] = useState<CPCARecourseType>('appel_commercial');
  const [notificationDate, setNotificationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bailiffName, setBailiffName] = useState('Maître Farouk Ziane (Huissier de Justice)');
  const [domicileCategory, setDomicileCategory] = useState<DomicileCategory>('local');
  const [notes, setNotes] = useState('');

  // Live preview calculation
  const preview = React.useMemo(() => {
    try {
      return calculateCPCADeadline(notificationDate, recourseType, domicileCategory);
    } catch {
      return null;
    }
  }, [notificationDate, recourseType, domicileCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) {
      showToast(isAr ? 'تاريخ التبليغ غير صالح' : 'Date de signification invalide', 'error');
      return;
    }

    const newDeadline: CPCADeadline = {
      id: `cpca_${Date.now()}`,
      accountId: 'acc_01',
      businessId: 'biz_legal',
      branchId: 'branch_legal_main',
      staffId: 'staff_01',
      matterId: selectedMatterId,
      caseNumber,
      courtJurisdiction,
      chamber,
      recourseType,
      notificationDate,
      bailiffName,
      domicileCategory,
      statutoryBaseDays: preview.baseDays,
      distanceExtensionDays: preview.distanceExtensionDays,
      terminalExpiryDate: preview.terminalExpiryDate,
      isRolledOver: preview.isRolledOver,
      rolloverReason: preview.rolloverReason,
      status: preview.isCritical ? 'critical' : 'running',
      notes,
      createdAt: new Date().toISOString(),
    };

    onSaveDeadline(newDeadline);
    showToast(
      isAr
        ? `تم تسليح أجل الاستئناف القانوني طبقاً للمادة 336 ق.إ.م.إ حتى ${new Date(preview.terminalExpiryDate).toLocaleDateString('fr-DZ')}`
        : `Délai de recours CPCA calculé et armé jusqu'au ${new Date(preview.terminalExpiryDate).toLocaleDateString('fr-DZ')} à 16:30`,
      'success'
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isLoading={networkMode === 'force_skeleton'}
      title={isAr ? 'تسليح أجل قانوني جديد (قانون الإجراءات المدنية والإدارية)' : 'Armer un Délai de Recours Légal (CPCA)'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner Alert */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
          <AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <span className="font-semibold block">
              {isAr ? 'محرك الحساب الآلي للمواعيد القانونية (قانون 08-09)' : 'Moteur de calcul certifié conforme CPCA (Loi n° 08-09)'}
            </span>
            <p className="text-[11px] opacity-90 mt-0.5">
              {isAr
                ? 'يبدأ سريان الأجل في اليوم الموالي للتبليغ (T+1). يتم تمديد الأجل تلقائياً إلى يوم الأحد إذا صادف يوم عطلة أو راحة أسبوعية (المادة 405).'
                : 'Le délai commence le lendemain de la signification (T+1). Report automatique au premier jour ouvrable (Dimanche 16:30) si expiration un vendredi/samedi ou jour férié (Art. 405 CPCA).'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LabelSelect
            label={isAr ? 'ملف القضية المرتبط' : 'Affaire / Dossier Lié'}
            value={selectedMatterId}
            onChange={setSelectedMatterId}
            options={matters.map((m) => ({
              value: m.id,
              label: `${m.matterNumber} - ${m.title}`,
            }))}
          />

          <LabelInput
            label={isAr ? 'رقم القضية لدى المحكمة / المجلس' : 'Numéro de Jugement / Rôle'}
            value={caseNumber}
            onChange={(e) => setCaseNumber(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <LabelSelect
            label={isAr ? 'طبيعة الطعن القضائي' : 'Voie de Recours (CPCA)'}
            value={recourseType}
            onChange={(v) => setRecourseType(v as CPCARecourseType)}
            options={[
              { value: 'appel_commercial', label: 'Appel Commercial (Art. 336 - 30j)' },
              { value: 'appel_civil', label: 'Appel Civil (Art. 336 - 30j)' },
              { value: 'appel_social', label: 'Appel Social (Art. 336 - 30j)' },
              { value: 'opposition', label: 'Opposition Jugement Défaut (Art. 329 - 10j)' },
              { value: 'pourvoi_cassation', label: 'Pourvoi en Cassation (Art. 568 - 2 mois)' },
              { value: 'appel_refere', label: 'Appel Ordonnance Référé (Art. 305 - 15j)' },
            ]}
          />

          <LabelInput
            type="date"
            label={isAr ? 'تاريخ محضر التبليغ الرسمي' : 'Date Signification Huissier'}
            value={notificationDate}
            onChange={(e) => setNotificationDate(e.target.value)}
            required
          />

          <LabelSelect
            label={isAr ? 'موطن الطرف (تمديد المسافة)' : 'Domicile (Délai de Distance)'}
            value={domicileCategory}
            onChange={(v) => setDomicileCategory(v as DomicileCategory)}
            options={[
              { value: 'local', label: 'Local (Nord / Centre) - 0 jour' },
              { value: 'grand_sud', label: 'Grand Sud (+15 jours - Art. 404)' },
              { value: 'abroad', label: 'Résident à l\'Étranger (+2 mois)' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LabelInput
            label={isAr ? 'المحضر القضائي القائم بالتبليغ' : 'Huissier de Justice Instrumentaire'}
            value={bailiffName}
            onChange={(e) => setBailiffName(e.target.value)}
            required
          />

          <LabelInput
            label={isAr ? 'المحكمة والغرفة القضائية' : 'Juridiction & Chambre'}
            value={`${courtJurisdiction} - ${chamber}`}
            onChange={(e) => setCourtJurisdiction(e.target.value)}
          />
        </div>

        {/* Live Calculation Result Preview Box */}
        {preview && (
          <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-800/60 border border-[#EDF1F3] dark:border-neutral-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {isAr ? 'النتيجة القانونية المحسوبة:' : 'Calcul Statutaire CPCA Automatique :'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold">
                {preview.statutoryReference}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
              <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/40">
                <span className="text-[10px] text-neutral-400 block">{isAr ? 'الأيام القانونية' : 'Délai de Base'}</span>
                <span className="font-bold text-neutral-900 dark:text-white font-mono">{preview.baseDays} j</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/40">
                <span className="text-[10px] text-neutral-400 block">{isAr ? 'تمديد المسافة' : 'Distance Art. 404'}</span>
                <span className="font-bold text-neutral-900 dark:text-white font-mono">+{preview.distanceExtensionDays} j</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/40 col-span-2">
                <span className="text-[10px] text-neutral-400 block">{isAr ? 'تاريخ ووقت السقوط النهائي' : 'Expiration Finale au Greffe'}</span>
                <span className="font-bold text-[#C4785A] font-mono text-xs">
                  {new Date(preview.terminalExpiryDate).toLocaleDateString('fr-DZ', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}{' '}
                  à 16:30
                </span>
              </div>
            </div>

            {preview.isRolledOver && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium pt-1">
                ⚠️ {preview.rolloverReason}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <AtriumButton variant="secondary" onClick={onClose} type="button">
            {isAr ? 'إلغاء' : 'Annuler'}
          </AtriumButton>
          <AtriumButton variant="primary" type="submit" icon={<ShieldCheck size={15} />}>
            {isAr ? 'تسليح الأجل في الرادار' : 'Armer le Délai CPCA'}
          </AtriumButton>
        </div>
      </form>
    </Modal>
  );
};

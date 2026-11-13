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
  const isEn = language === 'en';

  const [selectedMatterId, setSelectedMatterId] = useState(matters[0]?.id || '');
  const [caseNumber, setCaseNumber] = useState('26/01482');
  const [courtJurisdiction, setCourtJurisdiction] = useState('Tribunal de Sidi M\'Hamed');
  const [chamber, setChamber] = useState('Chambre Commerciale 2');
  const [recourseType, setRecourseType] = useState<CPCARecourseType>('appel_commercial');
  const [notificationDate, setNotificationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bailiffName, setBailiffName] = useState('Maître Farouk Ziane');
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
      showToast(isAr ? 'تاريخ غير صالح' : isEn ? 'Invalid date' : 'Date invalide', 'error');
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
        ? `تم حفظ الأجل حتى ${new Date(preview.terminalExpiryDate).toLocaleDateString('fr-DZ')}`
        : isEn
        ? `Deadline set for ${new Date(preview.terminalExpiryDate).toLocaleDateString('fr-DZ')}`
        : `Délai fixé au ${new Date(preview.terminalExpiryDate).toLocaleDateString('fr-DZ')}`,
      'success'
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isLoading={networkMode === 'force_skeleton'}
      title={isAr ? 'أجل قانوني جديد' : isEn ? 'New Legal Deadline' : 'Nouveau Délai'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner Alert */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
          <AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <span className="font-semibold block">
              {isAr ? 'حساب المواعيد التلقائي' : isEn ? 'Auto Deadline Calculator' : 'Calcul Automatique'}
            </span>
            <p className="text-[11px] opacity-90 mt-0.5">
              {isAr
                ? 'يبدأ الحساب في اليوم التالي للتبليغ مع التمديد التلقائي عند العطلات.'
                : isEn
                ? 'Starts the day after notice and rolls over weekends or holidays.'
                : 'Démarre le lendemain de la notification avec report des jours fériés.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LabelSelect
            label={isAr ? 'القضية المرتبطة' : isEn ? 'Linked Case' : 'Dossier Lié'}
            value={selectedMatterId}
            onChange={setSelectedMatterId}
            options={matters.map((m) => ({
              value: m.id,
              label: `${m.matterNumber} - ${m.title}`,
            }))}
          />

          <LabelInput
            label={isAr ? 'رقم القضية' : isEn ? 'Case Number' : 'N° Jugement'}
            value={caseNumber}
            onChange={(e) => setCaseNumber(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <LabelSelect
            label={isAr ? 'نوع الطعن' : isEn ? 'Filing Type' : 'Type Recours'}
            value={recourseType}
            onChange={(v) => setRecourseType(v as CPCARecourseType)}
            options={[
              { value: 'appel_commercial', label: isAr ? 'استئناف تجاري (30 يوم)' : isEn ? 'Commercial Appeal (30d)' : 'Appel Commercial (30j)' },
              { value: 'appel_civil', label: isAr ? 'استئناف مدني (30 يوم)' : isEn ? 'Civil Appeal (30d)' : 'Appel Civil (30j)' },
              { value: 'appel_social', label: isAr ? 'استئناف عمالي (30 يوم)' : isEn ? 'Labor Appeal (30d)' : 'Appel Social (30j)' },
              { value: 'opposition', label: isAr ? 'معارضة (10 أيام)' : isEn ? 'Opposition (10d)' : 'Opposition (10j)' },
              { value: 'pourvoi_cassation', label: isAr ? 'طعن بالنقض (شهران)' : isEn ? 'Supreme Appeal (2m)' : 'Cassation (2 mois)' },
              { value: 'appel_refere', label: isAr ? 'استعجالي (15 يوم)' : isEn ? 'Urgent Appeal (15d)' : 'Appel Référé (15j)' },
            ]}
          />

          <LabelInput
            type="date"
            label={isAr ? 'تاريخ التبليغ' : isEn ? 'Notice Date' : 'Date Notification'}
            value={notificationDate}
            onChange={(e) => setNotificationDate(e.target.value)}
            required
          />

          <LabelSelect
            label={isAr ? 'نطاق الإقامة' : isEn ? 'Party Location' : 'Domicile'}
            value={domicileCategory}
            onChange={(v) => setDomicileCategory(v as DomicileCategory)}
            options={[
              { value: 'local', label: isAr ? 'محلي (0 يوم)' : isEn ? 'Local (0d)' : 'Local (0j)' },
              { value: 'grand_sud', label: isAr ? 'الجنوب الكبير (+15 يوم)' : isEn ? 'Deep South (+15d)' : 'Grand Sud (+15j)' },
              { value: 'abroad', label: isAr ? 'بالخارج (+شهران)' : isEn ? 'Abroad (+2m)' : 'Étranger (+2m)' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LabelInput
            label={isAr ? 'المحضر القضائي' : isEn ? 'Bailiff Name' : 'Huissier'}
            value={bailiffName}
            onChange={(e) => setBailiffName(e.target.value)}
            required
          />

          <LabelInput
            label={isAr ? 'المحكمة والغرفة' : isEn ? 'Court & Chamber' : 'Tribunal & Chambre'}
            value={`${courtJurisdiction} - ${chamber}`}
            onChange={(e) => setCourtJurisdiction(e.target.value)}
          />
        </div>

        {/* Live Calculation Result Preview Box */}
        {preview && (
          <div className="p-4 rounded-2xl bg-[#F3EDE7] dark:bg-neutral-800/60 border border-[#E6DED6] dark:border-neutral-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-black/80 dark:text-white/80">
                {isAr ? 'الأجل المحسوب' : isEn ? 'Calculated Limit' : 'Calcul Automatique'}
              </span>
              <span className="text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold">
                {preview.baseDays + preview.distanceExtensionDays} {isAr ? 'يوم' : isEn ? 'days' : 'jours'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
              <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/40">
                <span className="text-[10px] text-black/55 dark:text-white/55 block">{isAr ? 'المدة الأساسية' : isEn ? 'Base Days' : 'Délai Base'}</span>
                <span className="font-bold text-black dark:text-white font-mono tabular-nums">{preview.baseDays} j</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/40">
                <span className="text-[10px] text-black/55 dark:text-white/55 block">{isAr ? 'تمديد المسافة' : isEn ? 'Extra Days' : 'Distance'}</span>
                <span className="font-bold text-black dark:text-white font-mono tabular-nums">+{preview.distanceExtensionDays} j</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/40 col-span-2">
                <span className="text-[10px] text-black/55 dark:text-white/55 block">{isAr ? 'تاريخ الانتهاء' : isEn ? 'Final Due' : 'Expiration Finale'}</span>
                <span className="font-bold text-[#d4522f] font-mono tabular-nums text-xs">
                  {new Date(preview.terminalExpiryDate).toLocaleDateString('fr-DZ', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  16:30
                </span>
              </div>
            </div>

            {preview.isRolledOver && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium pt-1">
                {preview.rolloverReason}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <AtriumButton variant="secondary" onClick={onClose} type="button">
            {isAr ? 'إلغاء' : isEn ? 'Cancel' : 'Annuler'}
          </AtriumButton>
          <AtriumButton variant="primary" type="submit" icon={<ShieldCheck size={15} />}>
            {isAr ? 'حفظ الأجل' : isEn ? 'Set Deadline' : 'Enregistrer Délai'}
          </AtriumButton>
        </div>
      </form>
    </Modal>
  );
};

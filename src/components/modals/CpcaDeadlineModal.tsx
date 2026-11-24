import React, { useState, useEffect } from 'react';
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
import { shallowEqualObjects, useAtriumSelector, showToast, resolveActiveScopeOrFail } from '../../services/store';
import { Modal } from '../ui/Modal';
import { AtriumButton } from '../ui/AtriumButton';
import { LabelInput } from '../ui/LabelInput';
import { LabelSelect } from '../ui/LabelSelect';
import { LiveSegmentedControl } from '../ui/live/LiveSegmentedControl';
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
  const { language, networkMode } = useAtriumSelector(
    (s) => ({ language: s.language, networkMode: s.networkMode || 'online' }),
    shallowEqualObjects
  );
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const [selectedMatterId, setSelectedMatterId] = useState(matters[0]?.id || '');
  const [caseNumber, setCaseNumber] = useState('26/01482');
  const [courtJurisdiction, setCourtJurisdiction] = useState("Tribunal de Sidi M'Hamed");
  const [chamber, setChamber] = useState('Chambre Commerciale 2');
  const [recourseType, setRecourseType] = useState<CPCARecourseType>('appel_commercial');
  const [notificationDate, setNotificationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bailiffName, setBailiffName] = useState('Maître Farouk Ziane');
  const [domicileCategory, setDomicileCategory] = useState<DomicileCategory>('local');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSelectedMatterId(matters[0]?.id || '');
    setCaseNumber('26/01482');
    setCourtJurisdiction("Tribunal de Sidi M'Hamed");
    setChamber('Chambre Commerciale 2');
    setRecourseType('appel_commercial');
    setNotificationDate(new Date().toISOString().split('T')[0]);
    setBailiffName('Maître Farouk Ziane');
    setDomicileCategory('local');
    setNotes('');
  }, [isOpen]);

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
    const scope = resolveActiveScopeOrFail();
    if (!scope) return;

    const newDeadline: CPCADeadline = {
      id: `cpca_${Date.now()}`,
      accountId: scope.accountId,
      businessId: scope.businessId || 'biz_legal',
      branchId: scope.branchId,
      staffId: scope.staffId || 'staff_01',
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--s4,16px)]">
        {/* Banner Alert */}
        <div
          data-sq="card"
          style={{ '--sq-stroke': 'rgba(245,158,11,0.28)' } as React.CSSProperties}
          className="p-[var(--s4,16px)] bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-start gap-[var(--s3,12px)]"
        >
          <AlertTriangle size={16} strokeWidth={1.5} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex flex-col gap-[var(--s1,4px)]">
            <span className="t-label font-semibold">
              {isAr ? 'حساب المواعيد التلقائي' : isEn ? 'Auto Deadline Calculator' : 'Calcul Automatique'}
            </span>
            <p className="t-cap opacity-90">
              {isAr
                ? 'يبدأ الحساب في اليوم التالي للتبليغ مع التمديد التلقائي عند العطلات.'
                : isEn
                ? 'Starts the day after notice and rolls over weekends or holidays.'
                : 'Démarre le lendemain de la notification avec report des jours fériés.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--s4,16px)]">
          <LabelSelect
            label={isAr ? 'القضية المرتبطة' : isEn ? 'Linked Case' : 'Dossier Lié'}
            value={selectedMatterId}
            onChange={setSelectedMatterId}
            height={40}
            options={matters.map((m) => ({
              value: m.id,
              label: `${m.matterNumber} - ${m.title}`,
            }))}
          />

          <LabelInput
            label={isAr ? 'رقم القضية' : isEn ? 'Case Number' : 'N° Jugement'}
            value={caseNumber}
            onChange={setCaseNumber}
            height={40}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--s4,16px)]">
          <LabelSelect
            label={isAr ? 'نوع الطعن' : isEn ? 'Filing Type' : 'Type Recours'}
            value={recourseType}
            onChange={(v) => setRecourseType(v as CPCARecourseType)}
            height={40}
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
            onChange={setNotificationDate}
            height={40}
            required
          />
        </div>

        <div className="flex flex-col gap-[var(--s1,4px)]">
          <label className="t-small font-medium text-[var(--text-2,#5A5047)] dark:text-[var(--text-dark-2,#A99E92)]">
            {isAr ? 'نطاق الإقامة' : isEn ? 'Party Location' : 'Domicile'}
          </label>
          <LiveSegmentedControl
            fullWidth
            size="md"
            value={domicileCategory}
            onValueChange={(v) => setDomicileCategory(v as DomicileCategory)}
            aria-label={isAr ? 'نطاق الإقامة' : isEn ? 'Party Location' : 'Domicile'}
            options={[
              { value: 'local', label: isAr ? 'محلي (0 يوم)' : isEn ? 'Local (0d)' : 'Local (0j)' },
              { value: 'grand_sud', label: isAr ? 'الجنوب الكبير (+15 يوم)' : isEn ? 'Deep South (+15d)' : 'Grand Sud (+15j)' },
              { value: 'abroad', label: isAr ? 'بالخارج (+شهران)' : isEn ? 'Abroad (+2m)' : 'Étranger (+2m)' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--s4,16px)]">
          <LabelInput
            label={isAr ? 'المحضر القضائي' : isEn ? 'Bailiff Name' : 'Huissier'}
            value={bailiffName}
            onChange={setBailiffName}
            height={40}
            required
          />

          <LabelInput
            label={isAr ? 'المحكمة والغرفة' : isEn ? 'Court & Chamber' : 'Tribunal & Chambre'}
            value={`${courtJurisdiction} - ${chamber}`}
            onChange={setCourtJurisdiction}
            height={40}
          />
        </div>

        {/* Live Calculation Result Preview Box */}
        {preview && (
          <div
            data-sq="panel"
            className="p-[var(--pod-pad,12px)] bg-[#F3EDE7] dark:bg-[#191716] flex flex-col gap-[var(--card-gap,12px)]"
          >
            <div className="flex items-center justify-between px-[var(--s1,4px)] pt-[var(--s1,4px)]">
              <span className="t-small font-semibold text-[var(--text-1,#17130F)] dark:text-white">
                {isAr ? 'الأجل المحسوب' : isEn ? 'Calculated Limit' : 'Calcul Automatique'}
              </span>
              <span className="t-small tabular-nums h-[var(--pill-h,24px)] px-[var(--pill-px,10px)] inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold">
                {preview.baseDays + preview.distanceExtensionDays} {isAr ? 'يوم' : isEn ? 'days' : 'jours'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--s2,8px)]">
              <div
                data-sq="card"
                className="p-[var(--s3,12px)] bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s1,4px)]"
              >
                <span className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)]">{isAr ? 'المدة الأساسية' : isEn ? 'Base Days' : 'Délai Base'}</span>
                <span className="t-label font-semibold text-[var(--text-1,#17130F)] dark:text-white tabular-nums">{preview.baseDays} j</span>
              </div>
              <div
                data-sq="card"
                className="p-[var(--s3,12px)] bg-white dark:bg-[#22201E] flex flex-col gap-[var(--s1,4px)]"
              >
                <span className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)]">{isAr ? 'تمديد المسافة' : isEn ? 'Extra Days' : 'Distance'}</span>
                <span className="t-label font-semibold text-[var(--text-1,#17130F)] dark:text-white tabular-nums">+{preview.distanceExtensionDays} j</span>
              </div>
              <div
                data-sq="card"
                className="p-[var(--s3,12px)] bg-white dark:bg-[#22201E] col-span-2 flex flex-col gap-[var(--s1,4px)]"
              >
                <span className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)]">{isAr ? 'تاريخ الانتهاء' : isEn ? 'Final Due' : 'Expiration Finale'}</span>
                <span className="t-label font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums">
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
              <p className="t-cap text-amber-700 dark:text-amber-300 px-[var(--s1,4px)]">
                {preview.rolloverReason}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-[var(--s2,8px)] pt-[var(--s2,8px)] border-t border-[var(--atr-divider)]">
          <AtriumButton variant="secondary" onClick={onClose} type="button">
            {isAr ? 'إلغاء' : isEn ? 'Cancel' : 'Annuler'}
          </AtriumButton>
          <AtriumButton variant="primary" type="submit" icon={<ShieldCheck size={16} strokeWidth={1.5} />}>
            {isAr ? 'حفظ الأجل' : isEn ? 'Set Deadline' : 'Enregistrer Délai'}
          </AtriumButton>
        </div>
      </form>
    </Modal>
  );
};

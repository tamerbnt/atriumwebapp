import React, { useMemo, useState } from 'react';
import { BookOpenCheck, CheckCircle2, Eye, Plus, Wallet } from 'lucide-react';
import {
  Member,
  PosCustomerCreditEntry,
  PosOpticalPrescription,
} from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import {
  summarizeCustomerCarnetBalance,
  validateOpticalPrescription,
} from '../../../utils/posDepth';
import { useTranslation } from '../../../utils/useTranslation';
import { ScreenPod } from '../../ui/kinetic';
import { Modal } from '../../ui/Modal';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { Button } from '@/atrium/core';
import { showToast } from '../../../services/store';

interface PosCarnetOpticalPanelProps {
  mode: 'carnet' | 'optical';
  entries: PosCustomerCreditEntry[];
  prescriptions: PosOpticalPrescription[];
  members: Member[];
  onRecordCarnetEntry: (input: {
    customerId?: string;
    customerName: string;
    customerPhone?: string;
    entryType: PosCustomerCreditEntry['entryType'];
    amountDzd: number;
    creditLimitDzd?: number;
    paymentMethod?: 'Cash' | 'Card' | 'BankTransfer' | 'CCP' | 'BaridiMob';
    notes?: string;
  }) => void;
  onUpsertOpticalRx: (
    input: Omit<PosOpticalPrescription, 'id' | 'branchId' | 'accountId' | 'businessId'> & {
      id?: string;
    }
  ) => { success: boolean; errors?: string[] };
}

export const PosCarnetOpticalPanel: React.FC<PosCarnetOpticalPanelProps> = ({
  mode,
  entries,
  prescriptions,
  members,
  onRecordCarnetEntry,
  onUpsertOpticalRx,
}) => {
  const { language, isRtl, t } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  // Carnet modal state
  const [isCarnetModalOpen, setIsCarnetModalOpen] = useState(false);
  const [carnetCustomerId, setCarnetCustomerId] = useState('');
  const [carnetCustomerName, setCarnetCustomerName] = useState('');
  const [carnetPhone, setCarnetPhone] = useState('');
  const [carnetType, setCarnetType] = useState<'charge' | 'repayment'>('repayment');
  const [carnetAmount, setCarnetAmount] = useState('');
  const [carnetMethod, setCarnetMethod] = useState<'Cash' | 'Card' | 'BaridiMob'>('Cash');
  const [carnetNotes, setCarnetNotes] = useState('');

  // Optical modal state
  const [isOpticalModalOpen, setIsOpticalModalOpen] = useState(false);
  const [rxCustomerName, setRxCustomerName] = useState('');
  const [rxCustomerPhone, setRxCustomerPhone] = useState('');
  const [rxOptometrist, setRxOptometrist] = useState('');
  const [rxOdSphere, setRxOdSphere] = useState('-1.25');
  const [rxOdCylinder, setRxOdCylinder] = useState('-0.50');
  const [rxOdAxis, setRxOdAxis] = useState('90');
  const [rxOsSphere, setRxOsSphere] = useState('-1.50');
  const [rxOsCylinder, setRxOsCylinder] = useState('-0.25');
  const [rxOsAxis, setRxOsAxis] = useState('85');
  const [rxPdMm, setRxPdMm] = useState('63');
  const [rxFrameModel, setRxFrameModel] = useState('');
  const [rxLensType, setRxLensType] = useState('Anti-reflet + Aminci 1.6');

  const carnetSummaries = useMemo(
    () => summarizeCustomerCarnetBalance(entries),
    [entries]
  );

  const totalOutstandingDzd = useMemo(
    () => carnetSummaries.reduce((sum, c) => sum + c.currentBalanceDzd, 0),
    [carnetSummaries]
  );

  const handleCarnetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(carnetAmount);
    const chosenMember = members.find((m) => m.id === carnetCustomerId);
    const finalName = chosenMember?.fullName || carnetCustomerName.trim();
    if (!finalName || !Number.isFinite(amt) || amt <= 0) return;

    onRecordCarnetEntry({
      customerId: chosenMember?.id,
      customerName: finalName,
      customerPhone: carnetPhone.trim() || chosenMember?.phoneNumber,
      entryType: carnetType,
      amountDzd: amt,
      paymentMethod: carnetMethod,
      notes: carnetNotes.trim() || undefined,
    });
    setCarnetAmount('');
    setCarnetNotes('');
    setIsCarnetModalOpen(false);
  };

  const handleOpticalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      customerName: rxCustomerName.trim(),
      customerPhone: rxCustomerPhone.trim() || undefined,
      optometristName: rxOptometrist.trim() || undefined,
      odSphere: parseFloat(rxOdSphere),
      odCylinder: parseFloat(rxOdCylinder),
      odAxis: parseInt(rxOdAxis, 10),
      osSphere: parseFloat(rxOsSphere),
      osCylinder: parseFloat(rxOsCylinder),
      osAxis: parseInt(rxOsAxis, 10),
      pdMm: parseFloat(rxPdMm),
      frameModel: rxFrameModel.trim() || undefined,
      lensType: rxLensType.trim() || undefined,
      labStatus: 'measured' as const,
      prescribedAt: new Date().toISOString().slice(0, 10),
    };
    const check = validateOpticalPrescription(payload);
    if (!check.valid) {
      showToast({
        type: 'warning',
        title: L('Invalid optical values', 'Valeurs optiques invalides', 'بيانات الوصفة غير صالحة'),
        message: check.errors.join(', '),
      });
      return;
    }
    const res = onUpsertOpticalRx(payload);
    if (res.success) {
      setRxCustomerName('');
      setRxFrameModel('');
      setIsOpticalModalOpen(false);
    }
  };

  const nextLabStatus: Record<PosOpticalPrescription['labStatus'], PosOpticalPrescription['labStatus']> = {
    measured: 'ordered_lab',
    ordered_lab: 'edging',
    edging: 'ready',
    ready: 'delivered',
    delivered: 'delivered',
  };

  if (mode === 'carnet') {
    return (
      <div className="space-y-5" dir={isRtl ? 'rtl' : 'ltr'}>
        <ScreenPod>
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--atr-divider)]">
            <div className="flex items-center gap-2">
              <BookOpenCheck size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
              <div>
                <h2 className="t-card font-semibold text-black dark:text-white">
                  {L('Customer Credit Ledger (Carnet de dettes)', 'Carnet de Dettes Clients (Crédit Comptoir)', 'دفتر ديون الزبائن (الكريدت)')}
                </h2>
                <p className="t-cap text-black/55 dark:text-white/55 tabular-nums">
                  {L('Total Outstanding:', 'Encours total :', 'إجمالي الديون القائمة:')} <strong>{formatMoney(totalOutstandingDzd)}</strong> · {carnetSummaries.length} {L('accounts', 'comptes', 'حساب')}
                </p>
              </div>
            </div>
            <Button
              type="button"
              tone="accent"
              size={36}
              leading={<Plus size={14} />}
              onClick={() => {
                setCarnetType('repayment');
                setIsCarnetModalOpen(true);
              }}
            >
              {L('Record Charge / Repayment', 'Enregistrer Crédit / Encaissement', 'تسجيل دين أو تسديد')}
            </Button>
          </div>

          {carnetSummaries.length === 0 ? (
            <div className="py-10 text-center t-small text-black/55 dark:text-white/55">
              {L(
                'No credit ledger entries yet. Complete a "Carnet / Credit" checkout or record an entry above.',
                'Aucune écriture de carnet. Validez une vente à crédit ou ajoutez un mouvement.',
                'لا توجد قيود في دفتر الديون بعد.'
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {carnetSummaries.map((c) => {
                const limitRatio = c.creditLimitDzd > 0 ? Math.min(100, Math.round((c.currentBalanceDzd / c.creditLimitDzd) * 100)) : 0;
                return (
                  <div
                    key={c.customerKey}
                    data-sq="card"
                    data-sq-border="solid"
                    className="p-4 bg-white dark:bg-[#22201E] sq-elev-card space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="t-small font-semibold text-black dark:text-white truncate">{c.customerName}</div>
                        <div className="t-cap text-black/55 dark:text-white/55">
                          {c.customerPhone || '—'} · {c.entryCount} {L('entries', 'mvt.', 'حركة')}
                        </div>
                      </div>
                      <span
                        className={`t-cap font-semibold px-2 py-0.5 rounded-full tabular-nums ${
                          c.overLimit
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                            : c.currentBalanceDzd > 0
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {formatMoney(c.currentBalanceDzd)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between t-cap text-black/55 dark:text-white/55 tabular-nums">
                        <span>{L('Credit Limit', 'Plafond', 'سقف الائتمان')}</span>
                        <span>{formatMoney(c.creditLimitDzd)} ({limitRatio}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#EFE9E2] dark:bg-[#2B2825] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${c.overLimit ? 'bg-red-500' : 'bg-[var(--brand-fill,#C9461F)]'}`}
                          style={{ width: `${limitRatio}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[var(--atr-divider)]">
                      <span className="t-cap text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {L('Repaid:', 'Réglé :', 'المدفوع:')} {formatMoney(c.totalRepaidCentimes / 100)}
                      </span>
                      <Button
                        type="button"
                        tone="soft"
                        size={32}
                        leading={<Wallet size={13} />}
                        onClick={() => {
                          setCarnetCustomerId(c.customerId || '');
                          setCarnetCustomerName(c.customerName);
                          setCarnetPhone(c.customerPhone || '');
                          setCarnetType('repayment');
                          setCarnetAmount(String(c.currentBalanceDzd || ''));
                          setIsCarnetModalOpen(true);
                        }}
                      >
                        {L('Collect Payment', 'Encaisser', 'تحصيل دفعة')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScreenPod>

        <Modal
          isOpen={isCarnetModalOpen}
          onClose={() => setIsCarnetModalOpen(false)}
          title={L('Carnet de dettes Entry', 'Écriture Carnet de Dettes', 'حركة في دفتر الديون')}
        >
          <form onSubmit={handleCarnetSubmit} className="space-y-4">
            <LabelSelect
              field="CarnetType"
              label={L('Entry Type', 'Type d’écriture', 'نوع العملية')}
              value={carnetType}
              onChange={(v) => setCarnetType(v as 'charge' | 'repayment')}
              options={[
                { value: 'repayment', label: L('Customer Repayment (Cash In)', 'Remboursement Client (Encaissement)', 'تسديد دين (قبض)') },
                { value: 'charge', label: L('Add Credit Charge', 'Nouvelle dette / Achat à crédit', 'إضافة دين جديد') },
              ]}
              height={40}
              corner={12}
            />
            {members.length > 0 && (
              <LabelSelect
                field="CarnetMember"
                label={L('Select Existing Customer (Optional)', 'Client enregistré (Optionnel)', 'زبون مسجل (اختياري)')}
                value={carnetCustomerId}
                onChange={(id) => {
                  setCarnetCustomerId(id);
                  const found = members.find((m) => m.id === id);
                  if (found) {
                    setCarnetCustomerName(found.fullName);
                    setCarnetPhone(found.phoneNumber || '');
                  }
                }}
                options={[
                  { value: '', label: L('-- Walk-in / Manual Name --', '-- Saisie manuelle --', '-- إدخال يدوي --') },
                  ...members.map((m) => ({ value: m.id, label: `${m.fullName} (${m.phoneNumber})` })),
                ]}
                height={40}
                corner={12}
              />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                field="CarnetName"
                label={L('Customer Name', 'Nom du client', 'اسم الزبون')}
                value={carnetCustomerName}
                onChange={setCarnetCustomerName}
                required
                width="100%"
                height={40}
                corner={12}
              />
              <LabelInput
                field="CarnetPhone"
                label={L('Phone', 'Téléphone', 'الهاتف')}
                value={carnetPhone}
                onChange={setCarnetPhone}
                width="100%"
                height={40}
                corner={12}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                field="CarnetAmount"
                label={L('Amount (DA)', 'Montant (DA)', 'المبلغ (د.ج)')}
                type="number"
                min="1"
                value={carnetAmount}
                onChange={setCarnetAmount}
                required
                width="100%"
                height={40}
                corner={12}
              />
              <LabelSelect
                field="CarnetMethod"
                label={L('Payment Method', 'Mode de paiement', 'طريقة الدفع')}
                value={carnetMethod}
                onChange={(v) => setCarnetMethod(v as any)}
                options={[
                  { value: 'Cash', label: t('pos_tender_cash') },
                  { value: 'Card', label: t('pos_tender_card') },
                  { value: 'BaridiMob', label: 'BaridiMob / CCP' },
                ]}
                height={40}
                corner={12}
              />
            </div>
            <LabelInput
              field="CarnetNotes"
              label={L('Reference / Notes', 'Référence / Notes', 'ملاحظات')}
              value={carnetNotes}
              onChange={setCarnetNotes}
              width="100%"
              height={40}
              corner={12}
            />
            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
              <Button type="button" tone="soft" size={40} onClick={() => setIsCarnetModalOpen(false)}>
                {t('action_cancel')}
              </Button>
              <Button type="submit" tone="accent" size={40}>
                {L('Save Entry', 'Enregistrer', 'حفظ القيد')}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // Optical Prescriptions Mode
  return (
    <div className="space-y-5" dir={isRtl ? 'rtl' : 'ltr'}>
      <ScreenPod>
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--atr-divider)]">
          <div className="flex items-center gap-2">
            <Eye size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
            <div>
              <h2 className="t-card font-semibold text-black dark:text-white">
                {L('Optical Prescriptions & Lab Order Tracking', 'Ordonnances Optiques & Suivi Montage Atelier', 'وصفات البصريات ومتابعة ورشة العدسات')}
              </h2>
              <p className="t-cap text-black/55 dark:text-white/55">
                {prescriptions.length} {L('recorded prescription(s)', 'ordonnance(s) enregistrée(s)', 'وصفة بصرية مسجلة')}
              </p>
            </div>
          </div>
          <Button
            type="button"
            tone="accent"
            size={36}
            leading={<Plus size={14} />}
            onClick={() => setIsOpticalModalOpen(true)}
          >
            {L('New Optical Rx', 'Nouvelle Ordonnance', 'وصفة بصرية جديدة')}
          </Button>
        </div>

        {prescriptions.length === 0 ? (
          <div className="py-10 text-center t-small text-black/55 dark:text-white/55">
            {L(
              'No optical prescriptions yet. Click "New Optical Rx" to record OD/OS diopters, PD, frame, and lab status.',
              'Aucune ordonnance optique. Cliquez sur « Nouvelle Ordonnance » pour enregistrer OD/OG, écart pupillaire et monture.',
              'لا توجد وصفات بصرية بعد.'
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {prescriptions.map((rx) => (
              <div
                key={rx.id}
                data-sq="card"
                data-sq-border="solid"
                className="p-4 bg-white dark:bg-[#22201E] sq-elev-card space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="t-small font-semibold text-black dark:text-white">{rx.customerName}</div>
                    <div className="t-cap text-black/55 dark:text-white/55">
                      {rx.prescribedAt} · {rx.customerPhone || '—'} · PD {rx.pdMm ?? '—'}mm
                    </div>
                  </div>
                  <span className="t-cap font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {rx.labStatus.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs tabular-nums bg-[#F5F1EC] dark:bg-[#191716] p-2.5 rounded-lg">
                  <div>
                    <div className="font-semibold text-black/60 dark:text-white/60">OD (Right)</div>
                    <div className="font-semibold text-black dark:text-white">
                      SPH {rx.odSphere ?? 0} · CYL {rx.odCylinder ?? 0} · AX {rx.odAxis ?? 0}°
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-black/60 dark:text-white/60">OS (Left)</div>
                    <div className="font-semibold text-black dark:text-white">
                      SPH {rx.osSphere ?? 0} · CYL {rx.osCylinder ?? 0} · AX {rx.osAxis ?? 0}°
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 t-cap">
                  <span className="text-black/65 dark:text-white/70 truncate">
                    {rx.frameModel ? `${rx.frameModel} · ` : ''}{rx.lensType || ''}
                  </span>
                  {rx.labStatus !== 'delivered' && (
                    <Button
                      type="button"
                      tone="soft"
                      size={32}
                      leading={<CheckCircle2 size={13} />}
                      onClick={() =>
                        onUpsertOpticalRx({
                          ...rx,
                          labStatus: nextLabStatus[rx.labStatus],
                        })
                      }
                    >
                      {L(`Advance -> ${nextLabStatus[rx.labStatus]}`, `Passer -> ${nextLabStatus[rx.labStatus]}`, `ترقية -> ${nextLabStatus[rx.labStatus]}`)}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScreenPod>

      <Modal
        isOpen={isOpticalModalOpen}
        onClose={() => setIsOpticalModalOpen(false)}
        title={L('Optical Prescription (OD / OS)', 'Ordonnance Optique (OD / OG)', 'وصفة العدسات والنظارات')}
      >
        <form onSubmit={handleOpticalSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              field="RxCustName"
              label={L('Patient Name', 'Client / Patient', 'اسم المريض')}
              value={rxCustomerName}
              onChange={setRxCustomerName}
              required
              width="100%"
              height={40}
              corner={12}
            />
            <LabelInput
              field="RxPhone"
              label={L('Phone', 'Téléphone', 'الهاتف')}
              value={rxCustomerPhone}
              onChange={setRxCustomerPhone}
              width="100%"
              height={40}
              corner={12}
            />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <LabelInput field="OdSph" label="OD Sphere" type="number" step="0.25" value={rxOdSphere} onChange={setRxOdSphere} width="100%" height={38} corner={10} />
            <LabelInput field="OdCyl" label="OD Cyl" type="number" step="0.25" value={rxOdCylinder} onChange={setRxOdCylinder} width="100%" height={38} corner={10} />
            <LabelInput field="OdAxis" label="OD Axis (°)" type="number" min="0" max="180" value={rxOdAxis} onChange={setRxOdAxis} width="100%" height={38} corner={10} />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <LabelInput field="OsSph" label="OS Sphere" type="number" step="0.25" value={rxOsSphere} onChange={setRxOsSphere} width="100%" height={38} corner={10} />
            <LabelInput field="OsCyl" label="OS Cyl" type="number" step="0.25" value={rxOsCylinder} onChange={setRxOsCylinder} width="100%" height={38} corner={10} />
            <LabelInput field="OsAxis" label="OS Axis (°)" type="number" min="0" max="180" value={rxOsAxis} onChange={setRxOsAxis} width="100%" height={38} corner={10} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <LabelInput field="RxPd" label="PD (mm)" type="number" min="40" max="85" value={rxPdMm} onChange={setRxPdMm} width="100%" height={38} corner={10} />
            <LabelInput field="RxFrame" label={L('Frame', 'Monture', 'الإطار')} value={rxFrameModel} onChange={setRxFrameModel} placeholder="Ray-Ban RX5154" width="100%" height={38} corner={10} />
            <LabelInput field="RxLens" label={L('Lens Type', 'Verres', 'نوع العدسات')} value={rxLensType} onChange={setRxLensType} width="100%" height={38} corner={10} />
          </div>
          <LabelInput
            field="RxOpto"
            label={L('Prescribing Optometrist / Dr', 'Ophtalmologue / Optométriste', 'الطبيب / الأخصائي')}
            value={rxOptometrist}
            onChange={setRxOptometrist}
            width="100%"
            height={38}
            corner={10}
          />
          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
            <Button type="button" tone="soft" size={40} onClick={() => setIsOpticalModalOpen(false)}>
              {t('action_cancel')}
            </Button>
            <Button type="submit" tone="accent" size={40}>
              {L('Save Prescription', 'Enregistrer ordonnance', 'حفظ الوصفة')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

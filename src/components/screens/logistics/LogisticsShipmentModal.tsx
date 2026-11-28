import React, { useState, useEffect, useMemo } from 'react';
import { Package, X, AlertCircle } from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
} from '../../../services/store';
import { t } from '../../../utils/i18n';
import { LogisticsShipment } from '../../../types';
import {
  computeShipmentTariff,
  validateAlgerianPhone,
  DEFAULT_TARIFF_RULES,
  TariffRule,
  WilayaZone,
} from '../../../utils/logisticsRules';
import {
  resolveWilayaCatalog,
  resolveWilayaZone,
  computeVolumetricBillingDetails,
} from '../../../utils/logisticsDepth';
import { isSupabaseConfigured, logisticsService, referenceDataService } from '../../../lib/supabase';
import type { WilayaReferenceRow } from '../../../lib/supabase/services/referenceDataService';
import { nextLogisticsSequentialCode } from './logisticsData';
import { formatMoney } from '../../../utils/rules';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { AtriumButton } from '../../ui/AtriumButton';
import { KineticModalShell } from '../../ui/kinetic';

const extractStr = (v: unknown): string =>
  typeof v === 'string'
    ? v
    : typeof v === 'number'
    ? String(v)
    : (v as { target?: { value?: string } })?.target?.value ?? '';

function deriveDeterministicOtp(seedStr: string): string {
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const num = (Math.abs(hash) % 9000) + 1000;
  return String(num);
}

interface LogisticsShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shipment: LogisticsShipment) => void;
  shipmentToEdit?: LogisticsShipment | null;
}

export const LogisticsShipmentModal: React.FC<LogisticsShipmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  shipmentToEdit,
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

  const [merchantName, setMerchantName] = useState(shipmentToEdit?.merchantName || '');
  const [recipientName, setRecipientName] = useState(shipmentToEdit?.recipientName || '');
  const [recipientPhone, setRecipientPhone] = useState(shipmentToEdit?.recipientPhone || '');
  const [destinationWilaya, setDestinationWilaya] = useState(shipmentToEdit?.destinationWilaya || '16 - Alger');
  const [address, setAddress] = useState(shipmentToEdit?.destinationAddress || '');
  const [deliveryMode, setDeliveryMode] = useState<'HomeDelivery' | 'StopDesk'>(shipmentToEdit?.deliveryMode || 'HomeDelivery');
  const [codAmount, setCodAmount] = useState(shipmentToEdit ? String(shipmentToEdit.codAmountDzd) : '');
  const [weightKg, setWeightKg] = useState(shipmentToEdit ? String(shipmentToEdit.weightKg) : '1.5');
  const [lengthCm, setLengthCm] = useState('25');
  const [widthCm, setWidthCm] = useState('20');
  const [heightCm, setHeightCm] = useState('10');
  const [isFragile, setIsFragile] = useState(false);

  const [wilayasRef, setWilayasRef] = useState<WilayaReferenceRow[] | null>(null);
  const [savedTariffs, setSavedTariffs] = useState<Record<WilayaZone, TariffRule>>(() => {
    try {
      const saved = localStorage.getItem('atrium_logistics_tariffs_v1');
      return saved ? { ...DEFAULT_TARIFF_RULES, ...JSON.parse(saved) } : DEFAULT_TARIFF_RULES;
    } catch {
      return DEFAULT_TARIFF_RULES;
    }
  });

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void referenceDataService.fetchWilayasRef().then(({ wilayas }) => {
      if (!cancelled) setWilayasRef(wilayas);
    }).catch(() => {});
    try {
      const saved = localStorage.getItem('atrium_logistics_tariffs_v1');
      if (saved) {
        setSavedTariffs({ ...DEFAULT_TARIFF_RULES, ...JSON.parse(saved) });
      }
    } catch {}
    if (isSupabaseConfigured() && currentBranch?.id) {
      void logisticsService.fetchWilayaTariffs(currentBranch.id).then((remote) => {
        if (!cancelled && Object.keys(remote).length > 0) {
          setSavedTariffs((prev) => ({ ...prev, ...remote }));
        }
      }).catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [isOpen, currentBranch?.id]);

  useEffect(() => {
    if (shipmentToEdit) {
      setMerchantName(shipmentToEdit.merchantName);
      setRecipientName(shipmentToEdit.recipientName);
      setRecipientPhone(shipmentToEdit.recipientPhone);
      setDestinationWilaya(shipmentToEdit.destinationWilaya);
      setAddress(shipmentToEdit.destinationAddress);
      setDeliveryMode(shipmentToEdit.deliveryMode || 'HomeDelivery');
      setCodAmount(String(shipmentToEdit.codAmountDzd));
      setWeightKg(String(shipmentToEdit.weightKg));
      if (shipmentToEdit.dimensionsCm) {
        setLengthCm(String(shipmentToEdit.dimensionsCm.length));
        setWidthCm(String(shipmentToEdit.dimensionsCm.width));
        setHeightCm(String(shipmentToEdit.dimensionsCm.height));
      }
    } else {
      setMerchantName('');
      setRecipientName('');
      setRecipientPhone('');
      setDestinationWilaya('16 - Alger');
      setAddress('');
      setDeliveryMode('HomeDelivery');
      setCodAmount('');
      setWeightKg('1.5');
      setLengthCm('25');
      setWidthCm('20');
      setHeightCm('10');
      setIsFragile(false);
    }
  }, [shipmentToEdit]);

  // Phone Validation & Operator Detection
  const phoneValidation = validateAlgerianPhone(recipientPhone);

  // Runtime wilaya catalog & zone resolution from wilayas_ref
  const wilayaCatalog = useMemo(() => resolveWilayaCatalog(wilayasRef), [wilayasRef]);
  const zoneResolution = useMemo(
    () => resolveWilayaZone(destinationWilaya, wilayasRef),
    [destinationWilaya, wilayasRef]
  );
  const currentZone = zoneResolution.zone;
  const activeRule = savedTariffs[currentZone] || DEFAULT_TARIFF_RULES[currentZone];

  const parsedDims = {
    length: parseFloat(lengthCm) || 0,
    width: parseFloat(widthCm) || 0,
    height: parseFloat(heightCm) || 0,
  };
  const parsedWeight = parseFloat(weightKg) || 1.0;

  const volumetricDetails = computeVolumetricBillingDetails({
    actualWeightKg: parsedWeight,
    dimensionsCm: parsedDims,
    rule: activeRule,
  });

  // Dynamic Tariff Calculation using tenant saved tariff rules
  const tariffCalc = computeShipmentTariff({
    actualWeightKg: parsedWeight,
    dimensionsCm: parsedDims,
    zone: currentZone,
    deliveryType: deliveryMode,
    codAmountDzd: parseFloat(codAmount) || 0,
    isFragile,
    customRules: activeRule,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim() || !recipientPhone.trim() || !address.trim()) {
      showToast(
        isAr ? 'يرجى إدخال اسم المستلم، الهاتف والعنوان' : 'Veuillez renseigner le destinataire, téléphone et adresse',
        'error'
      );
      return;
    }

    const activeAccountId = (shipmentToEdit?.accountId || currentBranch?.accountId || account?.id || '').trim();
    const activeBranchId = (shipmentToEdit?.branchId || currentBranch?.id || '').trim();
    if (!activeAccountId || !activeBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', language),
        message: t('tenant_context_missing_msg', language),
      });
      return;
    }

    const trackingCode = shipmentToEdit
      ? shipmentToEdit.trackingCode
      : nextLogisticsSequentialCode('log_parcel', 'ATR-EXP', 5);
    const seqDigits = parseInt(trackingCode.replace(/\D/g, '').slice(-4) || '1', 10) || 1;
    const rackLetter = String.fromCharCode(65 + (seqDigits % 4));
    const rackSlot = String((seqDigits % 20) + 1).padStart(2, '0');
    const deterministicShelf = `RACK-${rackLetter}-${rackSlot}`;
    const deterministicOtp = deriveDeterministicOtp(`${trackingCode}:${recipientPhone.trim()}:${activeBranchId}`);

    const saved: LogisticsShipment = {
      id: shipmentToEdit ? shipmentToEdit.id : `ship_${Date.now()}`,
      accountId: activeAccountId,
      businessId: currentBusiness?.id || currentBranch?.businessId || '',
      branchId: activeBranchId,
      staffId: currentUser?.id || '',
      trackingCode,
      merchantName: merchantName.trim() || 'Client Expéditeur Comptoir',
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone.trim(),
      destinationWilaya,
      destinationAddress: address.trim(),
      deliveryMode,
      dimensionsCm: {
        length: parseFloat(lengthCm) || 25,
        width: parseFloat(widthCm) || 20,
        height: parseFloat(heightCm) || 10,
      },
      codAmountDzd: parseFloat(codAmount) || 0,
      shippingFeeDzd: tariffCalc.totalDeliveryFeeDzd,
      stampDutyDzd: tariffCalc.stampDutyDzd,
      weightKg: tariffCalc.billableWeightKg,
      volumetricWeightKg: volumetricDetails.volumetricWeightKg,
      isFragile,
      stopDeskShelfCode: deliveryMode === 'StopDesk' ? (shipmentToEdit?.stopDeskShelfCode || deterministicShelf) : undefined,
      pickupOtpCode: deliveryMode === 'StopDesk' ? (shipmentToEdit?.pickupOtpCode || deterministicOtp) : undefined,
      status: shipmentToEdit?.status || 'ReceivedAtHub',
      assignedDriverName: shipmentToEdit?.assignedDriverName,
      createdAt: shipmentToEdit?.createdAt || new Date().toISOString(),
    };

    onSave(saved);
    onClose();
  };

  const wilayaOptions = useMemo(() => {
    const base = wilayaCatalog.options.map((w) => ({
      value: w.value,
      label: `${w.codeStr} - ${isAr ? w.nameAr : w.nameFr} (${w.zone.replace('Zone', 'Z').replace('_', ' ')})`,
    }));
    if (destinationWilaya && !base.some((o) => o.value === destinationWilaya)) {
      base.unshift({
        value: destinationWilaya,
        label: `${destinationWilaya} (${currentZone})`,
      });
    }
    return base;
  }, [wilayaCatalog.options, isAr, destinationWilaya, currentZone]);

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      scrimClassName="bg-black/60"
      ariaLabel={isAr ? 'تسجيل طرد وشحنة جديدة (AWB)' : 'Nouvelle Expédition (AWB)'}
    >
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="bg-white dark:bg-[#262422] w-full p-6 [--sq-stroke:var(--sq-stroke-pop)] space-y-4 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div
              data-sq="tile"
              data-sq-border="none"
              className="w-10 h-10 bg-[#FCEEE8] dark:bg-[#2B2825] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold"
            >
              <Package size={20} />
            </div>
            <div>
              <h3 className="font-semibold t-card text-black dark:text-white">
                {isAr ? 'تسجيل طرد وشحنة جديدة (AWB)' : 'Nouvelle Expédition (AWB)'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            aria-label={isAr ? 'إغلاق' : 'Fermer'}
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 space-y-4 pr-1">
          {/* Shipper & Delivery Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <LabelInput
              label={isAr ? 'التاجر / المتجر المرسل' : 'Marchand / Expéditeur'}
              value={merchantName}
              onChange={setMerchantName}
              placeholder="Ex: Boutique E-commerce..."
            />

            <div>
              <label className="block t-cap font-semibold text-black/65 dark:text-white/65 mb-1">
                {isAr ? 'طريقة الاستلام' : 'Mode de Livraison'}
              </label>
              <LiveSegmentedControl
                size="md"
                fullWidth
                value={deliveryMode}
                onValueChange={(v) => setDeliveryMode(v as 'HomeDelivery' | 'StopDesk')}
                aria-label={isAr ? 'طريقة الاستلام' : 'Mode de Livraison'}
                options={[
                  { value: 'HomeDelivery', label: isAr ? 'توصيل للمنزل' : 'À Domicile' },
                  { value: 'StopDesk', label: isAr ? 'استلام Stop-Desk' : 'Stop-Desk' },
                ]}
              />
            </div>
          </div>

          {/* Recipient Information with Operator Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <LabelInput
              label={isAr ? 'اسم المستلم' : 'Destinataire (Nom & Prénom)'}
              value={recipientName}
              onChange={setRecipientName}
              placeholder="Ex: Abdelkader Meziani"
              required
            />

            <div>
              <LabelInput
                label={isAr ? 'هاتف المستلم' : 'Téléphone'}
                value={recipientPhone}
                onChange={setRecipientPhone}
                placeholder="0555 41 22 33"
                required
                suffix={
                  recipientPhone.trim() ? (
                    <span
                      className={`t-cap font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                        phoneValidation.operator === 'Mobilis'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : phoneValidation.operator === 'Djezzy'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : phoneValidation.operator === 'Ooredoo'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                          : phoneValidation.operator === 'Fixe'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {phoneValidation.valid ? phoneValidation.operator : 'Format Invalide'}
                    </span>
                  ) : undefined
                }
              />
            </div>
          </div>

          {/* Address & Wilaya */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelSelect
              label={isAr ? 'ولاية الوجهة' : 'Wilaya de Destination'}
              value={destinationWilaya}
              onChange={(v) => setDestinationWilaya(extractStr(v))}
              options={wilayaOptions}
            />
            <LabelInput
              label={isAr ? 'العنوان والبلدية' : 'Adresse & Commune'}
              value={address}
              onChange={setAddress}
              placeholder="Cité, Bâtiment..."
              required
            />
          </div>

          {zoneResolution.isUnknownWilaya && (
            <div
              data-sq="ctl"
              className="flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 t-cap"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>
                {isAr
                  ? `رمز الولاية "${destinationWilaya}" غير مدرج في المرجع — تم تطبيق تعريفة المنطقة الاحتياطية (${currentZone}).`
                  : `Code wilaya "${destinationWilaya}" absent du référentiel — tarif de repli appliqué (${currentZone}).`}
              </span>
            </div>
          )}

          {/* Weight & Volumetric Dimensions */}
          <div
            data-sq="card"
            data-sq-border="none"
            className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="t-small font-semibold text-black dark:text-white">
                {isAr ? 'الوزن والقياسات الحجمية (Diviseur 5000)' : 'Poids & Encombrement Volumétrique'}
              </span>
              <div className="flex items-center gap-2">
                <span className="t-cap text-black/60 dark:text-white/60 tabular-nums">
                  Vol: {volumetricDetails.volumetricWeightKg} kg vs Réel: {volumetricDetails.actualWeightKg} kg
                  {volumetricDetails.usedVolumetric
                    ? isAr
                      ? ' (حجمي)'
                      : ' (Volumétrique retenu)'
                    : ''}
                </span>
                <span className="t-small tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold">
                  Facturé: {tariffCalc.billableWeightKg} kg
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 t-cap">
              <LabelInput
                label="Poids Réel (kg)"
                type="number"
                step="0.1"
                min="0.1"
                value={weightKg}
                onChange={setWeightKg}
              />
              <LabelInput
                label="Longueur (cm)"
                type="number"
                value={lengthCm}
                onChange={setLengthCm}
              />
              <LabelInput
                label="Largeur (cm)"
                type="number"
                value={widthCm}
                onChange={setWidthCm}
              />
              <LabelInput
                label="Hauteur (cm)"
                type="number"
                value={heightCm}
                onChange={setHeightCm}
              />
            </div>

            <label className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--atr-divider)] cursor-pointer select-none">
              <span className="t-cap font-medium text-black/80 dark:text-white/80">
                {isAr
                  ? `معاملة خاصة (طرد قابل للكسر / هش +${activeRule.fragileHandlingSurchargeDzd} دج)`
                  : `Manutention Fragile (+${activeRule.fragileHandlingSurchargeDzd} DZD)`}
              </span>
              <input
                type="checkbox"
                checked={isFragile}
                onChange={(e) => setIsFragile(e.target.checked)}
                className="w-4 h-4 accent-[#d4522f] cursor-pointer"
              />
            </label>
          </div>

          {/* Pricing & Fiscal Stamp Breakdown Card */}
          <div data-sq="card" data-sq-border="none" data-surface="dark" className="p-4 bg-[#191716] text-white space-y-2">
            <div className="flex items-center justify-between gap-3 t-cap border-b border-white/[0.12] pb-2">
              <span className="text-white/80">
                {isAr ? 'مبلغ السلعة COD' : 'Montant à Encaisser (COD)'}
              </span>
              <div className="flex items-center gap-2 w-40">
                <LabelInput
                  label="COD (DZD)"
                  type="number"
                  placeholder="5000"
                  value={codAmount}
                  onChange={setCodAmount}
                  suffix={<span className="t-cap text-white/65">DZD</span>}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 t-cap text-white/80 pt-1">
              <div>
                <span className="text-white/75 block">Frais Livraison:</span>
                <span className="tabular-nums font-semibold text-white">{formatMoney(tariffCalc.totalDeliveryFeeDzd, language)}</span>
              </div>
              <div>
                <span className="text-white/75 block">Timbre Art. 317:</span>
                <span className="tabular-nums font-semibold text-amber-400">+{tariffCalc.stampDutyDzd} DZD</span>
              </div>
              <div>
                <span className="text-white/75 block">Net Client au pas de porte:</span>
                <span className="tabular-nums font-semibold text-emerald-400">{formatMoney(tariffCalc.totalRecipientPayableDzd, language)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--atr-divider)] shrink-0">
            <AtriumButton variant="ghost" size="sm" type="button" onClick={onClose}>
              {isAr ? 'إلغاء' : 'Annuler'}
            </AtriumButton>
            <AtriumButton variant="primary" size="sm" type="submit">
              {isAr ? 'حفظ وإصدار الباركود' : 'Enregistrer & Éditer AWB'}
            </AtriumButton>
          </div>
        </form>
      </div>
    </KineticModalShell>
  );
};

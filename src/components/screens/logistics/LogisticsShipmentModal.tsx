import React, { useState, useEffect } from 'react';
import { Package, X, Phone, MapPin, Calculator, ShieldCheck } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { LogisticsShipment } from '../../../types';
import {
  computeShipmentTariff,
  validateAlgerianPhone,
  calculateVolumetricWeight,
  computeAlgerianFiscalStamp,
  WilayaZone,
} from '../../../utils/logisticsRules';
import { formatMoney } from '../../../utils/rules';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';

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
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';

  const [merchantName, setMerchantName] = useState(shipmentToEdit?.merchantName || '');
  const [recipientName, setRecipientName] = useState(shipmentToEdit?.recipientName || '');
  const [recipientPhone, setRecipientPhone] = useState(shipmentToEdit?.recipientPhone || '');
  const [destinationWilaya, setDestinationWilaya] = useState(shipmentToEdit?.destinationWilaya || '16 - Alger');
  const [address, setAddress] = useState(shipmentToEdit?.destinationAddress || '');
  const [deliveryMode, setDeliveryMode] = useState<'HomeDelivery' | 'StopDesk'>(shipmentToEdit?.deliveryMode || 'HomeDelivery');
  const [codAmount, setCodAmount] = useState(shipmentToEdit ? String(shipmentToEdit.codAmountDzd) : '5000');
  const [weightKg, setWeightKg] = useState(shipmentToEdit ? String(shipmentToEdit.weightKg) : '1.5');
  const [lengthCm, setLengthCm] = useState('25');
  const [widthCm, setWidthCm] = useState('20');
  const [heightCm, setHeightCm] = useState('10');
  const [isFragile, setIsFragile] = useState(false);

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
      setCodAmount('5000');
      setWeightKg('1.5');
      setLengthCm('25');
      setWidthCm('20');
      setHeightCm('10');
      setIsFragile(false);
    }
  }, [shipmentToEdit]);

  if (!isOpen) return null;

  // Phone Validation & Operator Detection
  const phoneValidation = validateAlgerianPhone(recipientPhone);

  // Determine Wilaya Zone
  const getZoneFromWilaya = (wilayaStr: string): WilayaZone => {
    if (wilayaStr.startsWith('16')) return 'Zone1_Local';
    if (wilayaStr.startsWith('09') || wilayaStr.startsWith('35') || wilayaStr.startsWith('42')) return 'Zone2_Proche';
    if (
      wilayaStr.startsWith('31') ||
      wilayaStr.startsWith('25') ||
      wilayaStr.startsWith('06') ||
      wilayaStr.startsWith('19') ||
      wilayaStr.startsWith('23') ||
      wilayaStr.startsWith('13')
    )
      return 'Zone3_Nord';
    if (
      wilayaStr.startsWith('05') ||
      wilayaStr.startsWith('17') ||
      wilayaStr.startsWith('14') ||
      wilayaStr.startsWith('34')
    )
      return 'Zone4_Plateaux';
    if (
      wilayaStr.startsWith('30') ||
      wilayaStr.startsWith('07') ||
      wilayaStr.startsWith('47') ||
      wilayaStr.startsWith('08')
    )
      return 'Zone5_Sud';
    return 'Zone6_GrandSud';
  };

  const currentZone = getZoneFromWilaya(destinationWilaya);

  // Dynamic Tariff Calculation
  const tariffCalc = computeShipmentTariff({
    actualWeightKg: parseFloat(weightKg) || 1.0,
    dimensionsCm: {
      length: parseFloat(lengthCm) || 0,
      width: parseFloat(widthCm) || 0,
      height: parseFloat(heightCm) || 0,
    },
    zone: currentZone,
    deliveryType: deliveryMode,
    codAmountDzd: parseFloat(codAmount) || 0,
    isFragile,
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

    const randomOtp = String(Math.floor(1000 + Math.random() * 9000));
    const randomShelf = `RACK-${String.fromCharCode(65 + Math.floor(Math.random() * 4))}-${String(Math.floor(1 + Math.random() * 20)).padStart(2, '0')}`;

    const saved: LogisticsShipment = {
      id: shipmentToEdit ? shipmentToEdit.id : `ship_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_logistics',
      branchId: currentBranch?.id || 'branch_logistics_main',
      staffId: currentUser?.id || 'staff_01',
      trackingCode: shipmentToEdit ? shipmentToEdit.trackingCode : `ATR-EXP-${Math.floor(10000 + Math.random() * 90000)}`,
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
      stopDeskShelfCode: deliveryMode === 'StopDesk' ? (shipmentToEdit?.stopDeskShelfCode || randomShelf) : undefined,
      pickupOtpCode: deliveryMode === 'StopDesk' ? (shipmentToEdit?.pickupOtpCode || randomOtp) : undefined,
      status: shipmentToEdit?.status || 'ReceivedAtHub',
      assignedDriverName: shipmentToEdit?.assignedDriverName,
      createdAt: shipmentToEdit?.createdAt || new Date().toISOString(),
    };

    onSave(saved);
    showToast(
      isAr ? 'تم تسجيل الطرد وحساب التسعيرة آلياً' : 'Colis enregistré avec succès (AWB & Tarification)',
      'success'
    );
    onClose();
  };

  const wilayaOptions = [
    { value: '16 - Alger', label: '16 - Alger (Zone 1 - Centre)' },
    { value: '09 - Blida', label: '09 - Blida (Zone 2 - Mitidja)' },
    { value: '35 - Boumerdès', label: '35 - Boumerdès (Zone 2 - Mitidja)' },
    { value: '42 - Tipaza', label: '42 - Tipaza (Zone 2 - Mitidja)' },
    { value: '31 - Oran', label: '31 - Oran (Zone 3 - Métropole Ouest)' },
    { value: '25 - Constantine', label: '25 - Constantine (Zone 3 - Métropole Est)' },
    { value: '19 - Sétif', label: '19 - Sétif (Zone 3 - Hauts-Plateaux)' },
    { value: '06 - Béjaïa', label: '06 - Béjaïa (Zone 3 - Côtier)' },
    { value: '23 - Annaba', label: '23 - Annaba (Zone 3 - Côtier Est)' },
    { value: '13 - Tlemcen', label: '13 - Tlemcen (Zone 3 - Ouest)' },
    { value: '05 - Batna', label: '05 - Batna (Zone 4 - Aurès)' },
    { value: '17 - Djelfa', label: '17 - Djelfa (Zone 4 - Steppes)' },
    { value: '30 - Ouargla', label: '30 - Ouargla (Zone 5 - Oasis/Pétrole)' },
    { value: '07 - Biskra', label: '07 - Biskra (Zone 5 - Zibans)' },
    { value: '11 - Tamanrasset', label: '11 - Tamanrasset (Zone 6 - Grand Sud)' },
    { value: '01 - Adrar', label: '01 - Adrar (Zone 6 - Grand Sud)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-[28px] max-w-2xl w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
              <Package size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                {isAr ? 'تسجيل طرد وشحنة جديدة (AWB 58 ولاية)' : 'Nouvelle Expédition (AWB 58 Wilayas)'}
              </h3>
              <p className="text-xs text-neutral-500">
                {isAr
                  ? 'حساب آلي للوزن الحجمي، طابع المادة 317 والتعريفة حسب المنطقة'
                  : 'Calcul automatique volumétrique, timbre fiscal Art. 317 & zonage légal'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 space-y-4 pr-1">
          {/* Shipper & Delivery Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'التاجر / المتجر المرسل' : 'Marchand / Expéditeur'}
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="Ex: Boutique E-commerce..."
            />

            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                {isAr ? 'طريقة الاستلام' : 'Mode de Livraison'}
              </label>
              <div className="flex rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1 border border-neutral-200 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => setDeliveryMode('HomeDelivery')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    deliveryMode === 'HomeDelivery'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {isAr ? 'توصيل للمنزل' : 'À Domicile'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMode('StopDesk')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    deliveryMode === 'StopDesk'
                      ? 'bg-white dark:bg-neutral-900 text-[#C4785A] shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {isAr ? 'استلام Stop-Desk' : 'Stop-Desk'}
                </button>
              </div>
            </div>
          </div>

          {/* Recipient Information with Operator Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'اسم المستلم' : 'Destinataire (Nom & Prénom)'}
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Ex: Abdelkader Meziani"
              required
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  {isAr ? 'هاتف المستلم' : 'Téléphone'}
                </label>
                {recipientPhone.trim() && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
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
                )}
              </div>
              <input
                type="text"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="0555 41 22 33"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-mono font-medium focus:border-[#C4785A] outline-hidden"
                required
              />
            </div>
          </div>

          {/* Address & Wilaya */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelSelect
              label={isAr ? 'ولاية الوجهة' : 'Wilaya de Destination'}
              value={destinationWilaya}
              onChange={setDestinationWilaya}
              options={wilayaOptions}
            />
            <LabelInput
              label={isAr ? 'العنوان والبلدية' : 'Adresse & Commune'}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Cité, Bâtiment..."
              required
            />
          </div>

          {/* Weight & Volumetric Dimensions */}
          <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-800/60 border border-[#EDF1F3] dark:border-neutral-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {isAr ? 'الوزن والقياسات الحجمية (Diviseur 5000)' : 'Poids & Encombrement Volumétrique'}
              </span>
              <span className="text-[11px] font-mono text-[#C4785A] font-bold">
                Facturé: {tariffCalc.billableWeightKg} kg
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-neutral-500 block">Poids Réel (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-500 block">Longueur (cm)</label>
                <input
                  type="number"
                  value={lengthCm}
                  onChange={(e) => setLengthCm(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-500 block">Largeur (cm)</label>
                <input
                  type="number"
                  value={widthCm}
                  onChange={(e) => setWidthCm(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-500 block">Hauteur (cm)</label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Fiscal Stamp Breakdown Card */}
          <div className="p-4 rounded-2xl bg-[#1F1D1B] text-white space-y-2">
            <div className="flex items-center justify-between text-xs border-b border-neutral-800 pb-2">
              <span className="text-neutral-300">
                {isAr ? 'مبلغ السلعة COD' : 'Montant à Encaisser (COD)'}
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={codAmount}
                  onChange={(e) => setCodAmount(e.target.value)}
                  className="w-28 px-2 py-1 rounded bg-neutral-800 text-right font-mono font-bold text-white text-xs border border-neutral-700"
                />
                <span className="font-mono text-xs">DZD</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-neutral-300 pt-1">
              <div>
                <span className="text-neutral-400 block">Frais Livraison:</span>
                <span className="font-mono font-bold text-white">{formatMoney(tariffCalc.totalDeliveryFeeDzd, language)}</span>
              </div>
              <div>
                <span className="text-neutral-400 block">Timbre Art. 317:</span>
                <span className="font-mono font-bold text-amber-400">+{tariffCalc.stampDutyDzd} DZD</span>
              </div>
              <div>
                <span className="text-neutral-400 block">Net Client au pas de porte:</span>
                <span className="font-mono font-black text-emerald-400">{formatMoney(tariffCalc.totalRecipientPayableDzd, language)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
            <AtriumButton variant="ghost" size="sm" type="button" onClick={onClose}>
              {isAr ? 'إلغاء' : 'Annuler'}
            </AtriumButton>
            <AtriumButton variant="primary" size="sm" type="submit">
              {isAr ? 'حفظ وإصدار الباركود' : 'Enregistrer & Éditer AWB'}
            </AtriumButton>
          </div>
        </form>
      </div>
    </div>
  );
};

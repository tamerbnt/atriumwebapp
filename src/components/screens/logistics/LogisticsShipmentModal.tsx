import React, { useState } from 'react';
import { Package, X } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { LogisticsShipment } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';

interface LogisticsShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shipment: LogisticsShipment) => void;
}

export const LogisticsShipmentModal: React.FC<LogisticsShipmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const [merchantName, setMerchantName] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [destinationWilaya, setDestinationWilaya] = useState('16 - Alger');
  const [address, setAddress] = useState('');
  const [codAmount, setCodAmount] = useState('5000');
  const [shippingFee, setShippingFee] = useState('600');
  const [weightKg, setWeightKg] = useState('1.0');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim() || !recipientPhone.trim() || !address.trim()) {
      showToast('Veuillez renseigner le destinataire, téléphone et adresse', 'error');
      return;
    }

    const created: LogisticsShipment = {
      id: `ship_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_logistics',
      branchId: currentBranch?.id || 'branch_logistics_main',
      staffId: currentUser?.id || 'staff_01',
      trackingCode: `ATR-EXP-${Math.floor(10000 + Math.random() * 90000)}`,
      merchantName: merchantName.trim() || 'Client Expéditeur Comptoir',
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone.trim(),
      destinationWilaya,
      destinationAddress: address.trim(),
      codAmountDzd: parseFloat(codAmount) || 0,
      shippingFeeDzd: parseFloat(shippingFee) || 600,
      weightKg: parseFloat(weightKg) || 1.0,
      status: 'ReceivedAtHub',
      createdAt: new Date().toISOString(),
    };

    onSave(created);
    showToast(
      language === 'ar' ? 'تم إنشاء الشحنة وتوليد الباركود بنجاح' : 'Colis enregistré avec succès (AWB)',
      'success'
    );
    onClose();
  };

  const wilayaOptions = [
    { value: '16 - Alger', label: '16 - Alger' },
    { value: '31 - Oran', label: '31 - Oran' },
    { value: '25 - Constantine', label: '25 - Constantine' },
    { value: '09 - Blida', label: '09 - Blida' },
    { value: '19 - Sétif', label: '19 - Sétif' },
    { value: '06 - Béjaïa', label: '06 - Béjaïa' },
    { value: '30 - Ouargla', label: '30 - Ouargla' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
              <Package size={16} />
            </div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
              {language === 'ar' ? 'تسجيل طرد وشحنة جديدة (AWB)' : 'Nouvelle Expédition (AWB)'}
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
            label={language === 'ar' ? 'التاجر / المتجر المرسل' : 'Marchand / Expéditeur'}
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            placeholder="Ex: Boutique E-commerce..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              label={language === 'ar' ? 'اسم المستلم' : 'Destinataire'}
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Ex: Abdelkader Meziani"
              required
            />
            <LabelInput
              label={language === 'ar' ? 'هاتف المستلم' : 'Téléphone'}
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              placeholder="0555..."
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelSelect
              label={language === 'ar' ? 'ولاية الوجهة' : 'Wilaya de destination'}
              value={destinationWilaya}
              onChange={setDestinationWilaya}
              options={wilayaOptions}
            />
            <LabelInput
              label={language === 'ar' ? 'العنوان التفصيلي' : 'Adresse précise'}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Cité, Bâtiment..."
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabelInput
              label={language === 'ar' ? 'مبلغ التحصيل (COD)' : 'Montant COD (DA)'}
              type="number"
              value={codAmount}
              onChange={(e) => setCodAmount(e.target.value)}
            />
            <LabelInput
              label={language === 'ar' ? 'تكلفة الشحن' : 'Frais de livraison'}
              type="number"
              value={shippingFee}
              onChange={(e) => setShippingFee(e.target.value)}
            />
            <LabelInput
              label={language === 'ar' ? 'الوزن (kg)' : 'Poids (kg)'}
              type="number"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <AtriumButton variant="secondary" onClick={onClose}>
              {language === 'ar' ? 'إلغاء' : 'Annuler'}
            </AtriumButton>
            <AtriumButton type="submit" variant="primary" icon={<Package size={14} />}>
              {language === 'ar' ? 'إنشاء الشحنة' : 'Enregistrer le Colis'}
            </AtriumButton>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Scale,
  Landmark,
  FileCheck,
  Building2,
  AlertCircle,
  Coins,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../services/store';
import { Modal } from '../ui/Modal';
import { AtriumButton } from '../ui/AtriumButton';
import { LabelInput } from '../ui/LabelInput';
import { LabelSelect } from '../ui/LabelSelect';
import { calculateNotaryDecret08243 } from '../../utils/legalRules';
import { formatMoney } from '../../utils/rules';
import { NotaryDeed } from '../../types';

interface NotaryDeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextIndex: number;
  onSaveDeed: (deed: NotaryDeed) => void;
}

export const NotaryDeedModal: React.FC<NotaryDeedModalProps> = ({
  isOpen,
  onClose,
  nextIndex,
  onSaveDeed,
}) => {
  const { language, networkMode } = useAtriumStore();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const [actType, setActType] = useState<NotaryDeed['actType']>('vente_immobiliere');
  const [titleFr, setTitleFr] = useState('Vente Immobilière Appartement F4 Haut Standing');
  const [titleAr, setTitleAr] = useState('عقد بيع عقاري لشقة ذات 4 غرف عالية الطراز');
  const [transactionValueDzd, setTransactionValueDzd] = useState<number>(12000000);

  // Parties
  const [vendorName, setVendorName] = useState('Hadj Amine Mansouri');
  const [vendorNin, setVendorNin] = useState('197516010045678912');
  const [purchaserName, setPurchaserName] = useState('Dr. Mourad Belkacem');
  const [purchaserNin, setPurchaserNin] = useState('198216010098765432');

  // Cadastre
  const [wilaya, setWilaya] = useState('Alger');
  const [commune, setCommune] = useState('El Biar');
  const [section, setSection] = useState('04');
  const [ilot, setIlot] = useState('18');
  const [lotNumber, setLotNumber] = useState('Lot 12 - Bloc B');
  const [livretFoncierNumber, setLivretFoncierNumber] = useState('LF-16/04-0982');

  // Tariff calculation
  const tariff = useMemo(() => {
    return calculateNotaryDecret08243(actType, transactionValueDzd);
  }, [actType, transactionValueDzd]);

  const repertoireNumber = `2026/${String(nextIndex).padStart(5, '0')}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const deed: NotaryDeed = {
      id: `deed_${Date.now()}`,
      accountId: 'acc_01',
      businessId: 'biz_legal',
      branchId: 'branch_legal_main',
      staffId: 'staff_01',
      repertoireNumber,
      repertoireIndex: nextIndex,
      actType,
      title: titleFr,
      titleAr: titleAr,
      transactionValueDzd,
      parties: {
        vendorName,
        vendorNin,
        purchaserName,
        purchaserNin,
      },
      cadastralReference: {
        wilaya,
        commune,
        section,
        ilot,
        lotNumber,
        livretFoncierNumber,
      },
      financials: {
        honorairesHtDzd: tariff.honorairesHtDzd,
        tvaAmountDzd: tariff.tvaAmountDzd,
        droitsEnregistrementDzd: tariff.droitsEnregistrementDzd,
        droitsPubliciteDzd: tariff.droitsPubliciteDzd,
        totalProvisionClientDzd: tariff.totalProvisionClientDzd,
      },
      status: 'minute_signed',
      signedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    onSaveDeed(deed);
    showToast(
      isAr
        ? `تم تسجيل العقد (${repertoireNumber})`
        : isEn
        ? `Deed saved (${repertoireNumber})`
        : `Acte enregistré (${repertoireNumber})`,
      'success'
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isLoading={networkMode === 'force_skeleton'}
      title={isAr ? `عقد جديد (${repertoireNumber})` : isEn ? `New Deed (${repertoireNumber})` : `Nouvel Acte (${repertoireNumber})`}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Repertoire Badge & Notice */}
        <div className="p-3 rounded-xl bg-[#d4522f]/10 border border-[#d4522f]/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-[#d4522f]" />
            <span className="font-semibold text-black dark:text-white">
              {isAr ? 'رقم الفهرس' : isEn ? 'Registry No.' : 'N° Répertoire'}
            </span>
          </div>
          <span className="font-mono font-bold text-sm text-[#d4522f] tracking-wider tabular-nums">
            {repertoireNumber}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <LabelSelect
            label={isAr ? 'نوع العقد' : isEn ? 'Deed Type' : 'Type Acte'}
            value={actType}
            onChange={(v) => setActType(v as NotaryDeed['actType'])}
            options={[
              { value: 'vente_immobiliere', label: isAr ? 'بيع عقاري' : isEn ? 'Property Sale' : 'Vente Immobilière' },
              { value: 'donation', label: isAr ? 'هبة عقارية' : isEn ? 'Property Gift' : 'Donation' },
              { value: 'bail_commercial', label: isAr ? 'إيجار تجاري' : isEn ? 'Commercial Lease' : 'Bail Commercial' },
              { value: 'fredha', label: isAr ? 'فريضة شرعية' : isEn ? 'Inheritance' : 'Frédha' },
              { value: 'statuts_societe', label: isAr ? 'قانون أساسي' : isEn ? 'Company Charter' : 'Statuts Société' },
              { value: 'procuration', label: isAr ? 'وكالة توثيقية' : isEn ? 'Power Attorney' : 'Procuration' },
            ]}
          />

          <LabelInput
            label={isAr ? 'قيمة المعاملة' : isEn ? 'Deal Value' : 'Montant (DZD)'}
            type="number"
            value={String(transactionValueDzd)}
            onChange={(e) => setTransactionValueDzd(Number(e.target.value) || 0)}
            required
          />

          <div className="flex flex-col justify-end">
            <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs">
              <span className="text-[10px] text-black/55 dark:text-white/55 block">{isAr ? 'بالسنتيم' : isEn ? 'In Centimes' : 'En Centimes'}</span>
              <span className="font-semibold text-black dark:text-white truncate block tabular-nums">
                {tariff.colloquialCentimesLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Bilingual Titles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <LabelInput
            label={isAr ? 'العنوان (فرنسية)' : isEn ? 'Title (French)' : 'Titre (FR)'}
            value={titleFr}
            onChange={(e) => setTitleFr(e.target.value)}
            required
          />
          <LabelInput
            label={isAr ? 'العنوان (عربية)' : isEn ? 'Title (Arabic)' : 'Titre (AR)'}
            value={titleAr}
            onChange={(e) => setTitleAr(e.target.value)}
            required
            className="text-right"
          />
        </div>

        {/* Parties */}
        <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/80 space-y-3">
          <span className="text-xs font-semibold text-black/85 dark:text-white/85 block">
            {isAr ? 'الأطراف والهوية' : isEn ? 'Contracting Parties' : 'Parties & Identité'}
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'البائع / المانح' : isEn ? 'Seller / Donor' : 'Vendeur'}
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              required
            />
            <LabelInput
              label={isAr ? 'الهوية الوطنية' : isEn ? 'National ID' : 'ID National'}
              value={vendorNin}
              onChange={(e) => setVendorNin(e.target.value)}
              required
            />
            <LabelInput
              label={isAr ? 'المشتري / المستفيد' : isEn ? 'Buyer / Recipient' : 'Acquéreur'}
              value={purchaserName}
              onChange={(e) => setPurchaserName(e.target.value)}
              required
            />
            <LabelInput
              label={isAr ? 'الهوية الوطنية' : isEn ? 'National ID' : 'ID National'}
              value={purchaserNin}
              onChange={(e) => setPurchaserNin(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Cadastre References */}
        {(actType === 'vente_immobiliere' || actType === 'donation') && (
          <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/80 space-y-3">
            <span className="text-xs font-semibold text-black/85 dark:text-white/85 block">
              {isAr ? 'المراجع العقارية' : isEn ? 'Land Registry' : 'Cadastre'}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <LabelInput label={isAr ? 'الولاية' : isEn ? 'Province' : 'Wilaya'} value={wilaya} onChange={(e) => setWilaya(e.target.value)} />
              <LabelInput label={isAr ? 'البلدية' : isEn ? 'District' : 'Commune'} value={commune} onChange={(e) => setCommune(e.target.value)} />
              <LabelInput label={isAr ? 'القسم' : isEn ? 'Section' : 'Section'} value={section} onChange={(e) => setSection(e.target.value)} />
              <LabelInput label={isAr ? 'الجزيرة' : isEn ? 'Block' : 'Îlot'} value={ilot} onChange={(e) => setIlot(e.target.value)} />
              <LabelInput label={isAr ? 'الحصة' : isEn ? 'Lot No.' : 'N° Lot'} value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} />
              <LabelInput label={isAr ? 'الدفتر العقاري' : isEn ? 'Title Book' : 'Livret Foncier'} value={livretFoncierNumber} onChange={(e) => setLivretFoncierNumber(e.target.value)} />
            </div>
          </div>
        )}

        {/* Fee Breakdown */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <Scale size={16} className="text-[#d4522f]" />
              <span className="text-xs font-bold text-black dark:text-white">
                {isAr ? 'التعريفة والرسوم' : isEn ? 'Fees & Taxes' : 'Tarifs & Taxes'}
              </span>
            </div>
            <span className="text-xs font-mono font-bold tabular-nums text-[#d4522f]">
              {isAr ? 'الإجمالي' : isEn ? 'Total' : 'Total'}: {formatMoney(tariff.totalProvisionClientDzd, language)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40">
              <span className="text-[10px] text-black/55 dark:text-white/55 block">{isAr ? 'أتعاب الموثق' : isEn ? 'Notary Fee' : 'Honoraires'}</span>
              <span className="font-bold text-black dark:text-white font-mono tabular-nums">{formatMoney(tariff.honorairesHtDzd, language)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40">
              <span className="text-[10px] text-black/55 dark:text-white/55 block">{isAr ? 'الضريبة' : isEn ? 'VAT' : 'TVA'}</span>
              <span className="font-bold text-black dark:text-white font-mono tabular-nums">{formatMoney(tariff.tvaAmountDzd, language)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40">
              <span className="text-[10px] text-black/55 dark:text-white/55 block">{isAr ? 'التسجيل' : isEn ? 'Registration' : 'Enregistrement'}</span>
              <span className="font-bold text-black dark:text-white font-mono tabular-nums">{formatMoney(tariff.droitsEnregistrementDzd, language)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40">
              <span className="text-[10px] text-black/55 dark:text-white/55 block">{isAr ? 'الشهر العقاري' : isEn ? 'Filing Fee' : 'Publicité'}</span>
              <span className="font-bold text-black dark:text-white font-mono tabular-nums">{formatMoney(tariff.droitsPubliciteDzd, language)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <AtriumButton variant="secondary" onClick={onClose} type="button">
            {isAr ? 'إلغاء' : isEn ? 'Cancel' : 'Annuler'}
          </AtriumButton>
          <AtriumButton variant="primary" type="submit" icon={<FileCheck size={15} />}>
            {isAr ? 'تسجيل العقد' : isEn ? 'Save Deed' : 'Signer Acte'}
          </AtriumButton>
        </div>
      </form>
    </Modal>
  );
};

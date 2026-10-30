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
  const { language } = useAtriumStore();
  const isAr = language === 'ar';

  const [actType, setActType] = useState<NotaryDeed['actType']>('vente_immobiliere');
  const [titleFr, setTitleFr] = useState('Vente Immobilière Appartement F4 Haut Standing');
  const [titleAr, setTitleAr] = useState('عقد بيع عقاري لشقة ذات 4 غرف عالية الطراز');
  const [transactionValueDzd, setTransactionValueDzd] = useState<number>(12000000); // 1.2 Milliard Centimes

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
        ? `تم تسجيل العقد التوثيقي تحت رقم الفهرس ${repertoireNumber} بنجاح`
        : `Acte notarié enregistré avec succès sous le n° au Répertoire ${repertoireNumber}`,
      'success'
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? `إعداد وتسجيل عقد رسمي في الفهرس (${repertoireNumber})` : `Rédaction d'Acte Authentique au Répertoire (${repertoireNumber})`}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Repertoire Badge & Notice */}
        <div className="p-3 rounded-xl bg-[#C4785A]/10 border border-[#C4785A]/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-[#C4785A]" />
            <span className="font-semibold text-neutral-900 dark:text-white">
              {isAr ? 'الرقم التسلسلي القانوني المحجوز:' : 'Numéro Chronologique Officiel Réservé :'}
            </span>
          </div>
          <span className="font-mono font-bold text-sm text-[#C4785A] tracking-wider">
            {repertoireNumber}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <LabelSelect
            label={isAr ? 'طبيعة العقد التوثيقي' : 'Type d\'Acte Authentique'}
            value={actType}
            onChange={(v) => setActType(v as NotaryDeed['actType'])}
            options={[
              { value: 'vente_immobiliere', label: 'Vente Immobilière (5 Tranches)' },
              { value: 'donation', label: 'Donation d\'Immeuble (5 Tranches)' },
              { value: 'bail_commercial', label: 'Bail Commercial Notarié' },
              { value: 'fredha', label: 'Acte de Frédha Charaïque' },
              { value: 'statuts_societe', label: 'Statuts de Société (SARL/SPA)' },
              { value: 'procuration', label: 'Procuration Notariée Fixe' },
            ]}
          />

          <LabelInput
            label={isAr ? 'مبلغ المعاملة بالدينار الجزائري' : 'Valeur de la Transaction (DZD)'}
            type="number"
            value={String(transactionValueDzd)}
            onChange={(e) => setTransactionValueDzd(Number(e.target.value) || 0)}
            required
          />

          <div className="flex flex-col justify-end">
            <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs">
              <span className="text-[10px] text-neutral-400 block">{isAr ? 'المقابل بالسنتيم الجزائري' : 'Équivalent en Centimes'}</span>
              <span className="font-semibold text-neutral-900 dark:text-white truncate block">
                {tariff.colloquialCentimesLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Bilingual Titles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <LabelInput
            label="Intitulé de l'Acte (Français)"
            value={titleFr}
            onChange={(e) => setTitleFr(e.target.value)}
            required
          />
          <LabelInput
            label="عنوان العقد الرسمي (بالعربية)"
            value={titleAr}
            onChange={(e) => setTitleAr(e.target.value)}
            required
            className="text-right"
          />
        </div>

        {/* Parties */}
        <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/80 space-y-3">
          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
            {isAr ? 'بيانات الأطراف والهوية البيومترية (NIN):' : 'Parties Contractantes & Identifiants Nationaux (NIN) :'}
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LabelInput
              label={isAr ? 'الطرف الأول (البائع / المانح)' : 'Partie 1 (Vendeur / Donateur)'}
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              required
            />
            <LabelInput
              label={isAr ? 'الرقم التعريفي الوطني (18 رقماً)' : 'NIN Vendeur (18 chiffres)'}
              value={vendorNin}
              onChange={(e) => setVendorNin(e.target.value)}
              required
            />
            <LabelInput
              label={isAr ? 'الطرف الثاني (المشتري / المستفيد)' : 'Partie 2 (Acquéreur / Donataire)'}
              value={purchaserName}
              onChange={(e) => setPurchaserName(e.target.value)}
              required
            />
            <LabelInput
              label={isAr ? 'الرقم التعريفي الوطني (18 رقماً)' : 'NIN Acquéreur (18 chiffres)'}
              value={purchaserNin}
              onChange={(e) => setPurchaserNin(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Cadastre References */}
        {(actType === 'vente_immobiliere' || actType === 'donation') && (
          <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/80 space-y-3">
            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
              {isAr ? 'المراجع العقارية والمسح العقاري (المحافظة العقارية):' : 'Références Cadastrales & Conservation Foncière :'}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <LabelInput label="Wilaya" value={wilaya} onChange={(e) => setWilaya(e.target.value)} />
              <LabelInput label="Commune" value={commune} onChange={(e) => setCommune(e.target.value)} />
              <LabelInput label="Section" value={section} onChange={(e) => setSection(e.target.value)} />
              <LabelInput label="Îlot" value={ilot} onChange={(e) => setIlot(e.target.value)} />
              <LabelInput label="N° Lot" value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} />
              <LabelInput label="Livret Foncier" value={livretFoncierNumber} onChange={(e) => setLivretFoncierNumber(e.target.value)} />
            </div>
          </div>
        )}

        {/* Décret 08-243 Statutory Breakdown */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <Scale size={16} className="text-[#C4785A]" />
              <span className="text-xs font-bold text-neutral-900 dark:text-white">
                {isAr ? 'التعريفة القانونية الرسمية (المرسوم التنفيذي 08-243)' : 'Calcul Officiel Décret 08-243 & Débours Fiscaux'}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-[#C4785A]">
              Total Provision : {formatMoney(tariff.totalProvisionClientDzd, language)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40">
              <span className="text-[10px] text-neutral-400 block">{isAr ? 'أتعاب التوثيق الخام' : 'Honoraires Notaire HT'}</span>
              <span className="font-bold text-neutral-900 dark:text-white font-mono">{formatMoney(tariff.honorairesHtDzd, language)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40">
              <span className="text-[10px] text-neutral-400 block">{isAr ? 'الرسم على القيمة المضافة (19%)' : 'TVA Notariale (19%)'}</span>
              <span className="font-bold text-neutral-900 dark:text-white font-mono">{formatMoney(tariff.tvaAmountDzd, language)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40">
              <span className="text-[10px] text-neutral-400 block">{isAr ? 'حقوق التسجيل (2.5%)' : 'Droits Enregistrement (2.5%)'}</span>
              <span className="font-bold text-neutral-900 dark:text-white font-mono">{formatMoney(tariff.droitsEnregistrementDzd, language)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40">
              <span className="text-[10px] text-neutral-400 block">{isAr ? 'الشهر العقاري (1.0%)' : 'Publicité Foncière (1.0%)'}</span>
              <span className="font-bold text-neutral-900 dark:text-white font-mono">{formatMoney(tariff.droitsPubliciteDzd, language)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <AtriumButton variant="secondary" onClick={onClose} type="button">
            {isAr ? 'إلغاء' : 'Annuler'}
          </AtriumButton>
          <AtriumButton variant="primary" type="submit" icon={<FileCheck size={15} />}>
            {isAr ? 'تسجيل العقد وحجز الرقم في الفهرس' : 'Signer la Minute & Valider au Répertoire'}
          </AtriumButton>
        </div>
      </form>
    </Modal>
  );
};

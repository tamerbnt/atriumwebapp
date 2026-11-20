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
import { useAtriumStore } from '../../services/store';
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--s4,16px)]">
        {/* Repertoire Badge & Notice */}
        <div
          data-sq="card"
          style={{ '--sq-stroke': 'rgba(212,82,47,0.2)' } as React.CSSProperties}
          className="p-[var(--s3,12px)] bg-[#d4522f]/10 flex items-center justify-between"
        >
          <div className="flex items-center gap-[var(--icon-text-gap,8px)]">
            <BookOpen size={16} strokeWidth={1.5} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
            <span className="t-small font-semibold text-[var(--text-1,#17130F)] dark:text-white">
              {isAr ? 'رقم الفهرس' : isEn ? 'Registry No.' : 'N° Répertoire'}
            </span>
          </div>
          <span className="t-label font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums">
            {repertoireNumber}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--s3,12px)]">
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
            <div data-sq="ctl" className="p-[var(--s3,12px)] bg-neutral-100 dark:bg-neutral-800 flex flex-col gap-[var(--s1,4px)]">
              <span className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)]">{isAr ? 'بالسنتيم' : isEn ? 'In Centimes' : 'En Centimes'}</span>
              <span className="t-small font-semibold text-[var(--text-1,#17130F)] dark:text-white truncate tabular-nums">
                {tariff.colloquialCentimesLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Bilingual Titles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--s3,12px)]">
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
        <div data-sq="card" className="p-[var(--s4,16px)] bg-neutral-50 dark:bg-neutral-800/50 flex flex-col gap-[var(--s3,12px)]">
          <span className="t-small font-semibold text-[var(--text-1,#17130F)] dark:text-white">
            {isAr ? 'الأطراف والهوية' : isEn ? 'Contracting Parties' : 'Parties & Identité'}
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--s3,12px)]">
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
          <div data-sq="card" className="p-[var(--s4,16px)] bg-neutral-50 dark:bg-neutral-800/50 flex flex-col gap-[var(--s3,12px)]">
            <span className="t-small font-semibold text-[var(--text-1,#17130F)] dark:text-white">
              {isAr ? 'المراجع العقارية' : isEn ? 'Land Registry' : 'Cadastre'}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-[var(--s2,8px)]">
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
        <div className="sq-elev-card">
          <div data-sq="panel" className="p-[var(--pod-pad,12px)] bg-white dark:bg-neutral-800 flex flex-col gap-[var(--card-gap,12px)]">
            <div className="flex items-center justify-between pb-[var(--s2,8px)] border-b border-[var(--atr-divider)]">
              <div className="flex items-center gap-[var(--icon-text-gap,8px)]">
                <Scale size={16} strokeWidth={1.5} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                <span className="t-small font-semibold text-[var(--text-1,#17130F)] dark:text-white">
                  {isAr ? 'التعريفة والرسوم' : isEn ? 'Fees & Taxes' : 'Tarifs & Taxes'}
                </span>
              </div>
              <span className="t-small font-semibold tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                {isAr ? 'الإجمالي' : isEn ? 'Total' : 'Total'}: {formatMoney(tariff.totalProvisionClientDzd, language)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--card-gap,12px)]">
              <div data-sq="card" className="p-[var(--s3,12px)] bg-neutral-50 dark:bg-neutral-900/40 flex flex-col gap-[var(--s1,4px)]">
                <span className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)]">{isAr ? 'أتعاب الموثق' : isEn ? 'Notary Fee' : 'Honoraires'}</span>
                <span className="t-label font-semibold text-[var(--text-1,#17130F)] dark:text-white tabular-nums">{formatMoney(tariff.honorairesHtDzd, language)}</span>
              </div>
              <div data-sq="card" className="p-[var(--s3,12px)] bg-neutral-50 dark:bg-neutral-900/40 flex flex-col gap-[var(--s1,4px)]">
                <span className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)]">{isAr ? 'الضريبة' : isEn ? 'VAT' : 'TVA'}</span>
                <span className="t-label font-semibold text-[var(--text-1,#17130F)] dark:text-white tabular-nums">{formatMoney(tariff.tvaAmountDzd, language)}</span>
              </div>
              <div data-sq="card" className="p-[var(--s3,12px)] bg-neutral-50 dark:bg-neutral-900/40 flex flex-col gap-[var(--s1,4px)]">
                <span className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)]">{isAr ? 'التسجيل' : isEn ? 'Registration' : 'Enregistrement'}</span>
                <span className="t-label font-semibold text-[var(--text-1,#17130F)] dark:text-white tabular-nums">{formatMoney(tariff.droitsEnregistrementDzd, language)}</span>
              </div>
              <div data-sq="card" className="p-[var(--s3,12px)] bg-neutral-50 dark:bg-neutral-900/40 flex flex-col gap-[var(--s1,4px)]">
                <span className="t-cap text-[var(--text-3,#766C62)] dark:text-[var(--text-dark-2,#A99E92)]">{isAr ? 'الشهر العقاري' : isEn ? 'Filing Fee' : 'Publicité'}</span>
                <span className="t-label font-semibold text-[var(--text-1,#17130F)] dark:text-white tabular-nums">{formatMoney(tariff.droitsPubliciteDzd, language)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-[var(--s2,8px)] pt-[var(--s2,8px)] border-t border-[var(--atr-divider)]">
          <AtriumButton variant="secondary" onClick={onClose} type="button">
            {isAr ? 'إلغاء' : isEn ? 'Cancel' : 'Annuler'}
          </AtriumButton>
          <AtriumButton variant="primary" type="submit" icon={<FileCheck size={16} strokeWidth={1.5} />}>
            {isAr ? 'تسجيل العقد' : isEn ? 'Save Deed' : 'Signer Acte'}
          </AtriumButton>
        </div>
      </form>
    </Modal>
  );
};

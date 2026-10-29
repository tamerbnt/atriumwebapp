import React, { useState } from 'react';
import { X, FileText, CheckCircle, Calculator, ShieldCheck } from 'lucide-react';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { RealEstateProperty, RealEstateMandate, MandateType } from '../../../types';
import { calculateMandateCommission } from '../../../utils/realEstateRules';

interface MandateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mandate: RealEstateMandate) => void;
  properties: RealEstateProperty[];
  selectedProperty?: RealEstateProperty | null;
}

export const MandateModal: React.FC<MandateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  properties,
  selectedProperty,
}) => {
  const [propertyId, setPropertyId] = useState(selectedProperty?.id || (properties[0]?.id ?? ''));
  const activeProp = properties.find((p) => p.id === propertyId) || selectedProperty || properties[0];

  const [mandateType, setMandateType] = useState<MandateType>('Vente_Simple');
  const [ownerFullName, setOwnerFullName] = useState(activeProp?.ownerName || '');
  const [ownerPhone, setOwnerPhone] = useState(activeProp?.ownerPhone || '');
  const [ownerNationalId, setOwnerNationalId] = useState(activeProp?.ownerNationalId || '109823487129837401');
  const [ownerIdIssueDate, setOwnerIdIssueDate] = useState('2021-05-10');
  const [ownerIdIssueDaira, setOwnerIdIssueDaira] = useState('Alger');

  const [askingPriceDzd, setAskingPriceDzd] = useState<number>(activeProp?.priceDzd || 15000000);
  const [minimumAcceptablePriceDzd, setMinimumAcceptablePriceDzd] = useState<number>(
    activeProp ? Math.round(activeProp.priceDzd * 0.95) : 14250000
  );
  const [commissionMode, setCommissionMode] = useState<'DecreeTranches' | 'FlatPercent' | 'FixedAmount'>('DecreeTranches');
  const [commissionRatePercent, setCommissionRatePercent] = useState<number>(1.0);
  const [commissionPayer, setCommissionPayer] = useState<'Seller' | 'Buyer' | 'Split50_50'>('Split50_50');

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationMonths, setDurationMonths] = useState(3);
  const [isExclusive, setIsExclusive] = useState(mandateType.includes('Exclusif'));
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  // Calculate endDate from startDate + durationMonths
  const start = new Date(startDate);
  start.setMonth(start.getMonth() + Number(durationMonths));
  const endDate = start.toISOString().split('T')[0];

  // Calculate commission preview
  const commissionCalc = calculateMandateCommission(
    askingPriceDzd,
    commissionMode,
    commissionRatePercent
  );

  const handlePropertyChange = (newPropId: string) => {
    setPropertyId(newPropId);
    const chosen = properties.find((p) => p.id === newPropId);
    if (chosen) {
      setOwnerFullName(chosen.ownerName);
      setOwnerPhone(chosen.ownerPhone);
      setAskingPriceDzd(chosen.priceDzd);
      setMinimumAcceptablePriceDzd(Math.round(chosen.priceDzd * 0.95));
      if (chosen.ownerNationalId) {
        setOwnerNationalId(chosen.ownerNationalId);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const branchCode = 'HYD';
    const randSeq = Math.floor(1000 + Math.random() * 9000);
    const mandateNumber = `MND-2026-${branchCode}-00${randSeq}`;

    const newMandate: RealEstateMandate = {
      id: `mnd_${Date.now()}`,
      accountId: activeProp?.accountId || 'acc_01',
      businessId: activeProp?.businessId || 'biz_realestate',
      branchId: activeProp?.branchId || 'branch_realestate_main',
      staffId: activeProp?.staffId || 'staff_01',
      negotiatorName: 'Karim Zerrouki (Négociateur)',
      mandateNumber,
      mandateType,
      status: 'Active',
      propertyId: activeProp?.id || 'prop_01',
      propertyTitle: activeProp?.title || 'Bien Immobilier',
      propertyAddress: activeProp?.address || 'Adresse à Alger',
      propertyType: activeProp?.propertyType || 'Apartment',
      listingType: mandateType.includes('Location') || mandateType === 'Gestion_Locative' ? 'Rental' : 'Sale',
      ownerFullName: ownerFullName.trim() || 'Propriétaire Mandant',
      ownerPhone: ownerPhone.trim() || '0550 00 00 00',
      ownerNationalId: ownerNationalId.trim() || '109823487129837401',
      ownerIdIssueDate,
      ownerIdIssueDaira,
      askingPriceDzd: Number(askingPriceDzd) || 0,
      minimumAcceptablePriceDzd: Number(minimumAcceptablePriceDzd) || 0,
      commissionCalculationMode: commissionMode,
      commissionRatePercent: commissionMode === 'FlatPercent' ? commissionRatePercent : undefined,
      commissionEstimatedHtDzd: commissionCalc.baseHt,
      commissionEstimatedTtcDzd: commissionCalc.totalTtc,
      commissionPayer,
      startDate,
      endDate,
      renewalCount: 0,
      isExclusive: Boolean(isExclusive),
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(newMandate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#18181B] rounded-[28px] shadow-2xl border border-[#E9EEF0] dark:border-[#27272A] p-6 md:p-8 my-8 text-[#18181B] dark:text-[#FAFAFA]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8EC] dark:border-[#27272A] mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Nouveau Mandat d'Agence (Décret 09-18)</h2>
              <p className="text-xs text-[#64748B] dark:text-[#A1A1AA]">
                Enregistrement chronologique officiel au registre des mandats de l'agence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#64748B] hover:text-[#18181B] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Property and Mandate Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LabelSelect
              label="Bien Immobilier Rattaché"
              value={propertyId}
              onChange={(val) => handlePropertyChange(val)}
              options={properties.map((p) => ({
                value: p.id,
                label: `${p.title} (${p.cityWilaya})`,
              }))}
            />

            <LabelSelect
              label="Nature du Mandat"
              value={mandateType}
              onChange={(val) => {
                setMandateType(val as MandateType);
                setIsExclusive(val.includes('Exclusif'));
              }}
              options={[
                { value: 'Vente_Simple', label: 'Vente Simple (Non-exclusif)' },
                { value: 'Vente_Exclusif', label: 'Vente Exclusive (Décret 09-18)' },
                { value: 'Location_Habitation', label: 'Location Habitation (1 mois)' },
                { value: 'Location_Commercial', label: 'Location Commerciale' },
                { value: 'Gestion_Locative', label: 'Gestion Locative Annuelle' },
              ]}
            />
          </div>

          {/* Section 2: Owner Legal Identification (Décret 09-18 Requirement) */}
          <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-[#141416] border border-[#EDF1F3] dark:border-[#232328] space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#C4785A] uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Identité Légale du Mandant (Propriétaire)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <LabelInput
                label="Nom & Prénom"
                value={ownerFullName}
                onChange={(e) => setOwnerFullName(e.target.value)}
                required
              />
              <LabelInput
                label="N° Téléphone"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                required
              />
              <LabelInput
                label="N° CNI / Passeport (18 Chiffres)"
                value={ownerNationalId}
                onChange={(e) => setOwnerNationalId(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <LabelInput
                type="date"
                label="Date de Délivrance CNI"
                value={ownerIdIssueDate}
                onChange={(e) => setOwnerIdIssueDate(e.target.value)}
              />
              <LabelInput
                label="Daïra / Commune Émettrice"
                value={ownerIdIssueDaira}
                onChange={(e) => setOwnerIdIssueDaira(e.target.value)}
              />
            </div>
          </div>

          {/* Section 3: Financial Terms & Commission Tranches */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LabelInput
              type="number"
              label="Prix Demandé Mandant (DZD)"
              value={askingPriceDzd}
              onChange={(e) => setAskingPriceDzd(Number(e.target.value))}
              required
            />
            <LabelInput
              type="number"
              label="Prix Seuil Minimal Acceptable (DZD)"
              value={minimumAcceptablePriceDzd}
              onChange={(e) => setMinimumAcceptablePriceDzd(Number(e.target.value))}
            />
            <LabelSelect
              label="Mode Calcul Commission"
              value={commissionMode}
              onChange={(val) => setCommissionMode(val as any)}
              options={[
                { value: 'DecreeTranches', label: 'Barème Décret 09-18 (3% / 2% / 1%)' },
                { value: 'FlatPercent', label: 'Pourcentage Négocié Fixe' },
                { value: 'FixedAmount', label: 'Montant Forfaitaire Fixe' },
              ]}
            />
          </div>

          {commissionMode === 'FlatPercent' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LabelInput
                type="number"
                step="0.1"
                label="Taux de Commission (%)"
                value={commissionRatePercent}
                onChange={(e) => setCommissionRatePercent(Number(e.target.value))}
              />
              <LabelSelect
                label="Charge de la Commission"
                value={commissionPayer}
                onChange={(val) => setCommissionPayer(val as any)}
                options={[
                  { value: 'Split50_50', label: 'Partage 50% Vendeur / 50% Acquéreur' },
                  { value: 'Seller', label: '100% à la charge du Vendeur' },
                  { value: 'Buyer', label: '100% à la charge de l\'Acquéreur' },
                ]}
              />
            </div>
          )}

          {/* Commission Calculation Live Pod */}
          <div className="p-4 rounded-2xl bg-[#FDF4F0] dark:bg-[#1C1816] border border-[#C4785A]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#C4785A] text-white flex items-center justify-center font-bold">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-[#64748B] dark:text-[#A1A1AA]">
                  {commissionMode === 'DecreeTranches'
                    ? 'Honoraires Légaux Dégressifs (Décret 09-18 Art. 34)'
                    : `Honoraires Forfaitaires (${commissionRatePercent}%)`}
                </div>
                <div className="text-sm font-semibold text-[#18181B] dark:text-white">
                  Base HT: <span className="font-mono text-[#C4785A] font-bold">{commissionCalc.baseHt.toLocaleString()} DZD</span> · TVA (19%): <span className="font-mono">{commissionCalc.tva.toLocaleString()} DZD</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs uppercase text-[#64748B] dark:text-[#A1A1AA] font-semibold">Total TTC</span>
              <div className="text-lg font-bold font-mono text-[#C4785A]">
                {commissionCalc.totalTtc.toLocaleString()} DZD
              </div>
            </div>
          </div>

          {/* Section 4: Period and Exclusivity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LabelInput
              type="date"
              label="Date d'Effet du Mandat"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />

            <LabelSelect
              label="Durée du Mandat"
              value={durationMonths.toString()}
              onChange={(val) => setDurationMonths(Number(val))}
              options={[
                { value: '3', label: '3 Mois (Standard Légal Vente)' },
                { value: '6', label: '6 Mois' },
                { value: '12', label: '12 Mois (Gestion Locative)' },
              ]}
            />

            <div className="flex items-center gap-3 pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                <input
                  type="checkbox"
                  checked={isExclusive}
                  onChange={(e) => setIsExclusive(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E2E8EC] text-[#C4785A] focus:ring-[#C4785A]"
                />
                <span>Mandat d'Exclusivité Accordé</span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <LabelInput
            label="Conditions Particulières / Observations (Optionnel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Clés remises à l'agence, visites le samedi après-midi uniquement..."
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8EC] dark:border-[#27272A]">
            <AtriumButton variant="secondary" onClick={onClose} type="button">
              Annuler
            </AtriumButton>
            <AtriumButton variant="primary" icon={<CheckCircle size={14} />} type="submit">
              Enregistrer au Registre Officiel
            </AtriumButton>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Building2, X, ShieldCheck, CheckCircle } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { RealEstateProperty, PropertyLegalTitleType } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { calculateTitleStrengthScore } from '../../../utils/realEstateRules';

interface RealEstatePropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prop: RealEstateProperty) => void;
  propertyToEdit?: RealEstateProperty | null;
}

export const RealEstatePropertyModal: React.FC<RealEstatePropertyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  propertyToEdit,
}) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();

  const [activeTab, setActiveTab] = useState<'general' | 'cadastre'>('general');

  // General fields
  const [title, setTitle] = useState(propertyToEdit?.title || '');
  const [propertyType, setPropertyType] = useState<'Apartment' | 'Villa' | 'Office' | 'Commercial' | 'Land' | 'Warehouse'>(
    propertyToEdit?.propertyType || 'Apartment'
  );
  const [listingType, setListingType] = useState<'Rental' | 'Sale'>(propertyToEdit?.listingType || 'Rental');
  const [surfaceM2, setSurfaceM2] = useState(propertyToEdit ? String(propertyToEdit.surfaceM2) : '120');
  const [roomsCount, setRoomsCount] = useState(propertyToEdit ? String(propertyToEdit.roomsCount) : '3');
  const [address, setAddress] = useState(propertyToEdit?.address || '');
  const [cityWilaya, setCityWilaya] = useState(propertyToEdit?.cityWilaya || 'Hydra, Alger');
  const [priceDzd, setPriceDzd] = useState(propertyToEdit ? String(propertyToEdit.priceDzd) : '150000');
  const [ownerName, setOwnerName] = useState(propertyToEdit?.ownerName || '');
  const [ownerPhone, setOwnerPhone] = useState(propertyToEdit?.ownerPhone || '');
  const [ownerNationalId, setOwnerNationalId] = useState(propertyToEdit?.ownerNationalId || '');

  // Cadastral Title Passport fields
  const [legalTitleType, setLegalTitleType] = useState<PropertyLegalTitleType>(
    propertyToEdit?.legalTitleType || 'Acte_Individuel_Livret'
  );
  const [hasLivretFoncier, setHasLivretFoncier] = useState<boolean>(propertyToEdit?.hasLivretFoncier ?? true);
  const [livretFoncierNumber, setLivretFoncierNumber] = useState(propertyToEdit?.livretFoncierNumber || '');
  const [volumeNumber, setVolumeNumber] = useState(propertyToEdit?.volumeNumber || '');
  const [caseNumber, setCaseNumber] = useState(propertyToEdit?.caseNumber || '');
  const [cadastralSection, setCadastralSection] = useState(propertyToEdit?.cadastralSection || '');
  const [cadastralIlot, setCadastralIlot] = useState(propertyToEdit?.cadastralIlot || '');
  const [cadastralLot, setCadastralLot] = useState(propertyToEdit?.cadastralLot || '');
  const [hasNegativeCertificate, setHasNegativeCertificate] = useState<boolean>(
    propertyToEdit?.hasNegativeCertificate ?? true
  );
  const [hasCertificatConformite, setHasCertificatConformite] = useState<boolean>(
    propertyToEdit?.hasCertificatConformite ?? true
  );
  const [isEligibleBankMortgage, setIsEligibleBankMortgage] = useState<boolean>(
    propertyToEdit?.isEligibleBankMortgage ?? true
  );
  const [isIndivision, setIsIndivision] = useState<boolean>(propertyToEdit?.isIndivision ?? false);
  const [fridhaNumber, setFridhaNumber] = useState(propertyToEdit?.fridhaNumber || '');

  React.useEffect(() => {
    if (propertyToEdit) {
      setTitle(propertyToEdit.title);
      setPropertyType(propertyToEdit.propertyType);
      setListingType(propertyToEdit.listingType || 'Rental');
      setSurfaceM2(String(propertyToEdit.surfaceM2));
      setRoomsCount(String(propertyToEdit.roomsCount));
      setAddress(propertyToEdit.address);
      setCityWilaya(propertyToEdit.cityWilaya);
      setPriceDzd(String(propertyToEdit.priceDzd));
      setOwnerName(propertyToEdit.ownerName);
      setOwnerPhone(propertyToEdit.ownerPhone);
      setOwnerNationalId(propertyToEdit.ownerNationalId || '');

      setLegalTitleType(propertyToEdit.legalTitleType || 'Acte_Individuel_Livret');
      setHasLivretFoncier(propertyToEdit.hasLivretFoncier ?? true);
      setLivretFoncierNumber(propertyToEdit.livretFoncierNumber || '');
      setVolumeNumber(propertyToEdit.volumeNumber || '');
      setCaseNumber(propertyToEdit.caseNumber || '');
      setCadastralSection(propertyToEdit.cadastralSection || '');
      setCadastralIlot(propertyToEdit.cadastralIlot || '');
      setCadastralLot(propertyToEdit.cadastralLot || '');
      setHasNegativeCertificate(propertyToEdit.hasNegativeCertificate ?? true);
      setHasCertificatConformite(propertyToEdit.hasCertificatConformite ?? true);
      setIsEligibleBankMortgage(propertyToEdit.isEligibleBankMortgage ?? true);
      setIsIndivision(propertyToEdit.isIndivision ?? false);
      setFridhaNumber(propertyToEdit.fridhaNumber || '');
    }
  }, [propertyToEdit]);

  if (!isOpen) return null;

  const titleStrength = calculateTitleStrengthScore(legalTitleType, hasLivretFoncier, hasNegativeCertificate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !address.trim() || !ownerName.trim()) {
      showToast('Veuillez renseigner le titre, l\'adresse et le propriétaire', 'error');
      return;
    }

    const saved: RealEstateProperty = {
      id: propertyToEdit ? propertyToEdit.id : `prop_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_realestate',
      branchId: currentBranch?.id || 'branch_realestate_main',
      staffId: currentUser?.id || 'staff_01',
      title: title.trim(),
      propertyType,
      listingType,
      surfaceM2: parseFloat(surfaceM2) || 100,
      roomsCount: parseInt(roomsCount) || 3,
      address: address.trim(),
      cityWilaya: cityWilaya.trim() || 'Alger',
      priceDzd: parseFloat(priceDzd) || 100000,
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      ownerNationalId: ownerNationalId.trim() || undefined,
      status: propertyToEdit?.status || 'Available',
      amenities: propertyToEdit?.amenities || ['Chauffage central', 'Cuisine équipée', 'Ascenseur'],
      legalTitleType,
      hasLivretFoncier,
      livretFoncierNumber: livretFoncierNumber.trim() || undefined,
      volumeNumber: volumeNumber.trim() || undefined,
      caseNumber: caseNumber.trim() || undefined,
      cadastralSection: cadastralSection.trim() || undefined,
      cadastralIlot: cadastralIlot.trim() || undefined,
      cadastralLot: cadastralLot.trim() || undefined,
      hasNegativeCertificate,
      hasCertificatConformite,
      isEligibleBankMortgage,
      isIndivision,
      fridhaNumber: fridhaNumber.trim() || undefined,
      mandateId: propertyToEdit?.mandateId,
      mandateNumber: propertyToEdit?.mandateNumber,
      createdAt: propertyToEdit?.createdAt || new Date().toISOString(),
    };

    onSave(saved);
    showToast(
      language === 'ar' ? 'تم حفظ العقار والسند القانوني بنجاح' : 'Bien et titre cadastral enregistrés avec succès',
      'success'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#18181B] rounded-[28px] max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-[#E9EEF0] dark:border-[#27272A] space-y-5 my-8 text-[#18181B] dark:text-[#FAFAFA]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8EC] dark:border-[#27272A] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#18181B] dark:text-white">
                {propertyToEdit ? 'Modifier le Bien & Passeport Foncier' : 'Nouveau Bien Immobilier & Passeport Cadastral'}
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#A1A1AA]">
                Intégration du descriptif technique et audit légal du titre de propriété
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#18181B] dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 border-b border-[#E2E8EC] dark:border-[#27272A] pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
              activeTab === 'general'
                ? 'bg-[#C4785A] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#18181B] dark:hover:text-white'
            }`}
          >
            1. Descriptif & Mandant
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cadastre')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors ${
              activeTab === 'cadastre'
                ? 'bg-[#C4785A] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#18181B] dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>2. Passeport Foncier & Titre Légal</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                titleStrength.score >= 80 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-200'
              }`}
            >
              {titleStrength.score}/100
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'general' ? (
            <>
              <LabelInput
                label="Titre Commercial de l'Annonce"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Appartement F4 Haut Standing Hydra"
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <LabelSelect
                  label="Type de Bien"
                  value={propertyType}
                  onChange={(val) => setPropertyType(val as any)}
                  options={[
                    { value: 'Apartment', label: 'Appartement' },
                    { value: 'Villa', label: 'Villa' },
                    { value: 'Office', label: 'Bureaux' },
                    { value: 'Commercial', label: 'Local Commercial' },
                    { value: 'Warehouse', label: 'Entrepôt' },
                    { value: 'Land', label: 'Terrain' },
                  ]}
                />

                <LabelSelect
                  label="Opération"
                  value={listingType}
                  onChange={(val) => setListingType(val as any)}
                  options={[
                    { value: 'Rental', label: 'Location' },
                    { value: 'Sale', label: 'Vente' },
                  ]}
                />

                <LabelInput
                  type="number"
                  label={listingType === 'Rental' ? 'Loyer Mensuel (DZD)' : 'Prix de Vente (DZD)'}
                  value={priceDzd}
                  onChange={(e) => setPriceDzd(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <LabelInput
                  type="number"
                  label="Superficie (m²)"
                  value={surfaceM2}
                  onChange={(e) => setSurfaceM2(e.target.value)}
                  required
                />
                <LabelInput
                  type="number"
                  label="Nombre de Pièces"
                  value={roomsCount}
                  onChange={(e) => setRoomsCount(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <LabelInput
                  label="Adresse Exacte"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Résidence Les Pins, Djenane El Malik"
                  required
                />
                <LabelInput
                  label="Commune, Wilaya"
                  value={cityWilaya}
                  onChange={(e) => setCityWilaya(e.target.value)}
                  placeholder="Ex: Hydra, Alger"
                  required
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#141416] border border-[#EDF1F3] dark:border-[#232328] space-y-3">
                <div className="text-xs font-semibold text-[#C4785A] uppercase">Coordonnées Propriétaire Mandant</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <LabelInput
                    label="Nom du Propriétaire"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                  />
                  <LabelInput
                    label="Téléphone"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    required
                  />
                  <LabelInput
                    label="N° CNI (Optionnel)"
                    value={ownerNationalId}
                    onChange={(e) => setOwnerNationalId(e.target.value)}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Cadastral Passport View */}
              <div className="p-3.5 rounded-2xl bg-[#FDF4F0] dark:bg-[#1C1816] border border-[#C4785A]/30 flex items-center justify-between">
                <div>
                  <div className="text-xs text-[#64748B] dark:text-[#A1A1AA]">Niveau de Sécurité Juridique</div>
                  <div className="text-sm font-bold text-[#18181B] dark:text-white flex items-center gap-1.5">
                    <span>{titleStrength.labelFr}</span>
                    <span className="text-xs font-mono text-[#C4785A]">({titleStrength.score}/100)</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {isEligibleBankMortgage ? '✓ Éligible Crédit Bancaire' : '✗ Vente Comptant Uniquement'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <LabelSelect
                  label="Nature Juridique du Titre"
                  value={legalTitleType}
                  onChange={(val) => {
                    const nextVal = val as PropertyLegalTitleType;
                    setLegalTitleType(nextVal);
                    setIsIndivision(nextVal === 'Bien_Dans_Indivision');
                  }}
                  options={[
                    { value: 'Acte_Individuel_Livret', label: 'Acte Notarié Individuel + Livret Foncier' },
                    { value: 'Bien_Dans_Indivision', label: 'Bien dans l\'Indivision (Fridha requise)' },
                    { value: 'Cession_OPGI_EPLF', label: 'Cession OPGI / Logement Public' },
                    { value: 'Papier_Timbre_Coutume', label: 'Papier Timbré / Coutume (Régularisation)' },
                  ]}
                />

                <div className="flex items-center gap-4 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={hasLivretFoncier}
                      onChange={(e) => setHasLivretFoncier(e.target.checked)}
                      className="w-4 h-4 rounded border-[#E2E8EC] text-[#C4785A] focus:ring-[#C4785A]"
                    />
                    <span>Livret Foncier Délivré</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={hasNegativeCertificate}
                      onChange={(e) => setHasNegativeCertificate(e.target.checked)}
                      className="w-4 h-4 rounded border-[#E2E8EC] text-[#C4785A] focus:ring-[#C4785A]"
                    />
                    <span>Certificat Négatif Valide</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <LabelInput
                  label="N° Livret Foncier"
                  value={livretFoncierNumber}
                  onChange={(e) => setLivretFoncierNumber(e.target.value)}
                  placeholder="Ex: LF-1601-2018-0941"
                />
                <LabelInput
                  label="Volume de Publication"
                  value={volumeNumber}
                  onChange={(e) => setVolumeNumber(e.target.value)}
                  placeholder="Ex: Vol. 142"
                />
                <LabelInput
                  label="Case d'Inscription"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  placeholder="Ex: Case 18"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <LabelInput
                  label="Section Cadastrale"
                  value={cadastralSection}
                  onChange={(e) => setCadastralSection(e.target.value)}
                  placeholder="Ex: Section 04"
                />
                <LabelInput
                  label="Numéro d'Îlot"
                  value={cadastralIlot}
                  onChange={(e) => setCadastralIlot(e.target.value)}
                  placeholder="Ex: Îlot 22"
                />
                <LabelInput
                  label="Numéro de Lot"
                  value={cadastralLot}
                  onChange={(e) => setCadastralLot(e.target.value)}
                  placeholder="Ex: Lot 14"
                />
              </div>

              {isIndivision && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2">
                  <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Spécificités Indivision & Héritage
                  </div>
                  <LabelInput
                    label="Numéro d'Enregistrement de la Fridha Notariée"
                    value={fridhaNumber}
                    onChange={(e) => setFridhaNumber(e.target.value)}
                    placeholder="Ex: FRIDHA-NOT-2025-0819"
                  />
                </div>
              )}

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={hasCertificatConformite}
                    onChange={(e) => setHasCertificatConformite(e.target.checked)}
                    className="w-4 h-4 rounded border-[#E2E8EC] text-[#C4785A] focus:ring-[#C4785A]"
                  />
                  <span>Certificat de Conformité (Loi 08-15)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={isEligibleBankMortgage}
                    onChange={(e) => setIsEligibleBankMortgage(e.target.checked)}
                    className="w-4 h-4 rounded border-[#E2E8EC] text-[#C4785A] focus:ring-[#C4785A]"
                  />
                  <span>Dossier Éligible Crédit Bancaire</span>
                </label>
              </div>
            </>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E2E8EC] dark:border-[#27272A]">
            {activeTab === 'general' ? (
              <button
                type="button"
                onClick={() => setActiveTab('cadastre')}
                className="text-xs text-[#C4785A] font-semibold hover:underline"
              >
                Passer au Passeport Foncier →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className="text-xs text-[#64748B] font-semibold hover:underline"
              >
                ← Retour au Descriptif
              </button>
            )}

            <div className="flex items-center gap-2.5">
              <AtriumButton variant="secondary" onClick={onClose} type="button">
                Annuler
              </AtriumButton>
              <AtriumButton variant="primary" icon={<CheckCircle size={14} />} type="submit">
                Enregistrer le Bien
              </AtriumButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

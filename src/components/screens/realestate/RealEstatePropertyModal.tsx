import React, { useState } from 'react';
import { Building2, X, ShieldCheck, CheckCircle } from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
} from '../../../services/store';
import { t } from '../../../utils/i18n';
import { RealEstateProperty, PropertyLegalTitleType } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { LiveSwitch } from '../../ui/live/LiveSwitch';
import { AtriumButton } from '../../ui/AtriumButton';
import { calculateTitleStrengthScore } from '../../../utils/realEstateRules';
import { KineticModalShell } from '../../ui/kinetic';

interface RealEstatePropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prop: RealEstateProperty) => void;
  propertyToEdit?: RealEstateProperty | null;
}



export const RealEstatePropertyModal: React.FC<RealEstatePropertyModalProps> = ({ isOpen, onClose, onSave, propertyToEdit }) => {
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
	const [activeTab, setActiveTab] = React.useState("general");
	const [title, setTitle] = React.useState(propertyToEdit?.title || "");
	const [propertyType, setPropertyType] = React.useState<RealEstateProperty['propertyType']>(propertyToEdit?.propertyType || "Apartment");
	const [listingType, setListingType] = React.useState<RealEstateProperty['listingType']>(propertyToEdit?.listingType || "Rental");
	const [surfaceM2, setSurfaceM2] = React.useState(propertyToEdit ? String(propertyToEdit.surfaceM2) : "120");
	const [roomsCount, setRoomsCount] = React.useState(propertyToEdit ? String(propertyToEdit.roomsCount) : "3");
	const [address, setAddress] = React.useState(propertyToEdit?.address || "");
	const [cityWilaya, setCityWilaya] = React.useState(propertyToEdit?.cityWilaya || "Hydra, Alger");
	const [priceDzd, setPriceDzd] = React.useState(propertyToEdit ? String(propertyToEdit.priceDzd) : "150000");
	const [ownerName, setOwnerName] = React.useState(propertyToEdit?.ownerName || "");
	const [ownerPhone, setOwnerPhone] = React.useState(propertyToEdit?.ownerPhone || "");
	const [ownerNationalId, setOwnerNationalId] = React.useState(propertyToEdit?.ownerNationalId || "");
	const [legalTitleType, setLegalTitleType] = React.useState(propertyToEdit?.legalTitleType || "Acte_Individuel_Livret");
	const [hasLivretFoncier, setHasLivretFoncier] = React.useState(propertyToEdit?.hasLivretFoncier ?? true);
	const [livretFoncierNumber, setLivretFoncierNumber] = React.useState(propertyToEdit?.livretFoncierNumber || "");
	const [volumeNumber, setVolumeNumber] = React.useState(propertyToEdit?.volumeNumber || "");
	const [caseNumber, setCaseNumber] = React.useState(propertyToEdit?.caseNumber || "");
	const [cadastralSection, setCadastralSection] = React.useState(propertyToEdit?.cadastralSection || "");
	const [cadastralIlot, setCadastralIlot] = React.useState(propertyToEdit?.cadastralIlot || "");
	const [cadastralLot, setCadastralLot] = React.useState(propertyToEdit?.cadastralLot || "");
	const [hasNegativeCertificate, setHasNegativeCertificate] = React.useState(propertyToEdit?.hasNegativeCertificate ?? true);
	const [hasCertificatConformite, setHasCertificatConformite] = React.useState(propertyToEdit?.hasCertificatConformite ?? true);
	const [isEligibleBankMortgage, setIsEligibleBankMortgage] = React.useState(propertyToEdit?.isEligibleBankMortgage ?? true);
	const [isIndivision, setIsIndivision] = React.useState(propertyToEdit?.isIndivision ?? false);
	const [fridhaNumber, setFridhaNumber] = React.useState(propertyToEdit?.fridhaNumber || "");
	React.useEffect(() => {
		if (propertyToEdit) {
			setTitle(propertyToEdit.title);
			setPropertyType(propertyToEdit.propertyType);
			setListingType(propertyToEdit.listingType || "Rental");
			setSurfaceM2(String(propertyToEdit.surfaceM2));
			setRoomsCount(String(propertyToEdit.roomsCount));
			setAddress(propertyToEdit.address);
			setCityWilaya(propertyToEdit.cityWilaya);
			setPriceDzd(String(propertyToEdit.priceDzd));
			setOwnerName(propertyToEdit.ownerName);
			setOwnerPhone(propertyToEdit.ownerPhone);
			setOwnerNationalId(propertyToEdit.ownerNationalId || "");
			setLegalTitleType(propertyToEdit.legalTitleType || "Acte_Individuel_Livret");
			setHasLivretFoncier(propertyToEdit.hasLivretFoncier ?? true);
			setLivretFoncierNumber(propertyToEdit.livretFoncierNumber || "");
			setVolumeNumber(propertyToEdit.volumeNumber || "");
			setCaseNumber(propertyToEdit.caseNumber || "");
			setCadastralSection(propertyToEdit.cadastralSection || "");
			setCadastralIlot(propertyToEdit.cadastralIlot || "");
			setCadastralLot(propertyToEdit.cadastralLot || "");
			setHasNegativeCertificate(propertyToEdit.hasNegativeCertificate ?? true);
			setHasCertificatConformite(propertyToEdit.hasCertificatConformite ?? true);
			setIsEligibleBankMortgage(propertyToEdit.isEligibleBankMortgage ?? true);
			setIsIndivision(propertyToEdit.isIndivision ?? false);
			setFridhaNumber(propertyToEdit.fridhaNumber || "");
		}
	}, [propertyToEdit]);
	const titleStrength = calculateTitleStrengthScore(legalTitleType, hasLivretFoncier, hasNegativeCertificate);
	const handleSubmit = (e: any) => {
		e.preventDefault();
		if (!title.trim() || !address.trim() || !ownerName.trim()) {
			showToast("Veuillez renseigner le titre, l'adresse et le propriétaire", "error");
			return;
		}
		const activeAccountId = (propertyToEdit?.accountId || currentBranch?.accountId || account?.id || "").trim();
		const activeBranchId = (propertyToEdit?.branchId || currentBranch?.id || "").trim();
		if (!activeAccountId || !activeBranchId) {
			showToast({
				type: "error",
				title: t("tenant_context_missing_title", language),
				message: t("tenant_context_missing_msg", language),
			});
			return;
		}
		onSave({
			id: propertyToEdit ? propertyToEdit.id : `prop_${Date.now()}`,
			accountId: activeAccountId,
			businessId: currentBusiness?.id || currentBranch?.businessId || "",
			branchId: activeBranchId,
			staffId: currentUser?.id || "",
			title: title.trim(),
			propertyType,
			listingType,
			surfaceM2: parseFloat(surfaceM2) || 100,
			roomsCount: parseInt(roomsCount) || 3,
			address: address.trim(),
			cityWilaya: cityWilaya.trim() || "Alger",
			priceDzd: parseFloat(priceDzd) || 1e5,
			ownerName: ownerName.trim(),
			ownerPhone: ownerPhone.trim(),
			ownerNationalId: ownerNationalId.trim() || void 0,
			status: propertyToEdit?.status || "Available",
			amenities: propertyToEdit?.amenities || [
				"Chauffage central",
				"Cuisine équipée",
				"Ascenseur"
			],
			legalTitleType,
			hasLivretFoncier,
			livretFoncierNumber: livretFoncierNumber.trim() || void 0,
			volumeNumber: volumeNumber.trim() || void 0,
			caseNumber: caseNumber.trim() || void 0,
			cadastralSection: cadastralSection.trim() || void 0,
			cadastralIlot: cadastralIlot.trim() || void 0,
			cadastralLot: cadastralLot.trim() || void 0,
			hasNegativeCertificate,
			hasCertificatConformite,
			isEligibleBankMortgage,
			isIndivision,
			fridhaNumber: fridhaNumber.trim() || void 0,
			mandateId: propertyToEdit?.mandateId,
			mandateNumber: propertyToEdit?.mandateNumber,
			createdAt: propertyToEdit?.createdAt || (/* @__PURE__ */ new Date()).toISOString()
		});
		onClose();
	};
	return (
		<KineticModalShell
			isOpen={isOpen}
			onClose={onClose}
			maxWidthClass="max-w-2xl"
			scrimClassName="bg-black/60"
			ariaLabel={propertyToEdit ? "Modifier le Bien & Passeport Foncier" : "Nouveau Bien Immobilier & Passeport Cadastral"}
		>
			<div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] w-full max-h-[92vh] overflow-y-auto p-6 md:p-8 [--sq-stroke:var(--sq-stroke-pop)] space-y-5 text-black dark:text-white">
<div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-4">
<div className="flex items-center gap-3">
<div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold"><Building2 className="w-5 h-5" /></div>
<div>
<h3 className="font-semibold t-pod text-black dark:text-white">
{propertyToEdit ? "Modifier le Bien & Passeport Foncier" : "Nouveau Bien Immobilier & Passeport Cadastral"}
</h3>
</div>
</div>
<button type="button" onClick={onClose} aria-label="Fermer" data-sq="ctl-sm" data-sq-border="none" className="w-8 h-8 flex items-center justify-center text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
</div>
<div className="pb-1">
<LiveSegmentedControl
  size="md"
  fullWidth
  value={activeTab}
  onValueChange={setActiveTab}
  aria-label="Sections du bien"
  options={[
    { value: "general", label: "1. Descriptif & Mandant" },
    {
      value: "cadastre",
      label: "2. Passeport Foncier & Titre Légal",
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
      count: `${titleStrength.score}/100`,
    },
  ]}
/>
</div>
<form onSubmit={handleSubmit} className="space-y-4">
{activeTab === "general" ? /* @__PURE__ */ <>
<LabelInput label="Titre Commercial de l'Annonce" value={title} onChange={setTitle} placeholder="Ex: Appartement F4 Haut Standing Hydra" required />
<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
<LabelSelect label="Type de Bien" value={propertyType} onChange={(val) => setPropertyType(val as RealEstateProperty['propertyType'])} options={[
										{
											value: "Apartment",
											label: "Appartement"
										},
										{
											value: "Villa",
											label: "Villa"
										},
										{
											value: "Office",
											label: "Bureaux"
										},
										{
											value: "Commercial",
											label: "Local Commercial"
										},
										{
											value: "Warehouse",
											label: "Entrepôt"
										},
										{
											value: "Land",
											label: "Terrain"
										}
									]} />
<LabelSelect label="Opération" value={listingType} onChange={(val) => setListingType(val as RealEstateProperty['listingType'])} options={[{
										value: "Rental",
										label: "Location"
									}, {
										value: "Sale",
										label: "Vente"
									}]} />
<LabelInput type="number" label={listingType === "Rental" ? "Loyer Mensuel (DZD)" : "Prix de Vente (DZD)"} value={priceDzd} onChange={setPriceDzd} required />
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
<LabelInput type="number" label="Superficie (m²)" value={surfaceM2} onChange={setSurfaceM2} required />
<LabelInput type="number" label="Nombre de Pièces" value={roomsCount} onChange={setRoomsCount} required />
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
<LabelInput label="Adresse Exacte" value={address} onChange={setAddress} placeholder="Ex: Résidence Les Pins, Djenane El Malik" required />
<LabelInput label="Commune, Wilaya" value={cityWilaya} onChange={setCityWilaya} placeholder="Ex: Hydra, Alger" required />
</div>
<div data-sq="card" data-sq-border="none" className="p-4 bg-[#F3EDE7] dark:bg-[#22201E] space-y-3">
<div className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">Coordonnées Propriétaire Mandant</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
<LabelInput label="Nom du Propriétaire" value={ownerName} onChange={setOwnerName} required />
<LabelInput label="Téléphone" value={ownerPhone} onChange={setOwnerPhone} required />
<LabelInput label="N° CNI (Optionnel)" value={ownerNationalId} onChange={setOwnerNationalId} />
</div>
</div>
</> : /* @__PURE__ */ <>
<div data-sq="card" data-sq-border="none" className="p-4 bg-[#FDF4F0] dark:bg-[#2B2825] flex items-center justify-between">
<div>
<div className="t-cap text-black/70 dark:text-white/75">Niveau de Sécurité Juridique</div>
<div className="t-label font-semibold text-black dark:text-white flex items-center gap-2">
<span>{titleStrength.labelFr}</span>
<span className="t-cap tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
(
{titleStrength.score}
/100)
</span>
</div>
</div>
<div className="text-right">
<span className="t-small font-semibold text-emerald-600 dark:text-emerald-400">
{isEligibleBankMortgage ? "✓ Éligible Crédit Bancaire" : "✗ Vente Comptant Uniquement"}
</span>
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
<LabelSelect label="Nature Juridique du Titre" value={legalTitleType} onChange={(val) => {
									const nextVal = val as PropertyLegalTitleType;
									setLegalTitleType(nextVal);
									setIsIndivision(nextVal === "Bien_Dans_Indivision");
								}} options={[
									{
										value: "Acte_Individuel_Livret",
										label: "Acte Notarié Individuel + Livret Foncier"
									},
									{
										value: "Bien_Dans_Indivision",
										label: "Bien dans l'Indivision (Fridha requise)"
									},
									{
										value: "Cession_OPGI_EPLF",
										label: "Cession OPGI / Logement Public"
									},
									{
										value: "Papier_Timbre_Coutume",
										label: "Papier Timbré / Coutume (Régularisation)"
									}
								]} />
<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
<div className="flex items-center justify-between gap-2 px-3 py-2 rounded-[var(--r-ctl,12px)] bg-[#F5F1EC] dark:bg-[#292624]">
<span className="t-small font-medium">Livret Foncier Délivré</span>
<LiveSwitch checked={hasLivretFoncier} onCheckedChange={setHasLivretFoncier} aria-label="Livret Foncier Délivré" />
</div>
<div className="flex items-center justify-between gap-2 px-3 py-2 rounded-[var(--r-ctl,12px)] bg-[#F5F1EC] dark:bg-[#292624]">
<span className="t-small font-medium">Certificat Négatif Valide</span>
<LiveSwitch checked={hasNegativeCertificate} onCheckedChange={setHasNegativeCertificate} aria-label="Certificat Négatif Valide" />
</div>
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
<LabelInput label="N° Livret Foncier" value={livretFoncierNumber} onChange={setLivretFoncierNumber} placeholder="Ex: LF-1601-2018-0941" />
<LabelInput label="Volume de Publication" value={volumeNumber} onChange={setVolumeNumber} placeholder="Ex: Vol. 142" />
<LabelInput label="Case d'Inscription" value={caseNumber} onChange={setCaseNumber} placeholder="Ex: Case 18" />
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
<LabelInput label="Section Cadastrale" value={cadastralSection} onChange={setCadastralSection} placeholder="Ex: Section 04" />
<LabelInput label="Numéro d'Îlot" value={cadastralIlot} onChange={setCadastralIlot} placeholder="Ex: Îlot 22" />
<LabelInput label="Numéro de Lot" value={cadastralLot} onChange={setCadastralLot} placeholder="Ex: Lot 14" />
</div>
{isIndivision && /* @__PURE__ */ <div data-sq="card" data-sq-border="none" className="p-3 bg-amber-50 dark:bg-amber-950/30 space-y-2">
<div className="t-small font-semibold text-amber-800 dark:text-amber-300">Spécificités Indivision & Héritage</div>
<LabelInput label="Numéro d'Enregistrement de la Fridha Notariée" value={fridhaNumber} onChange={setFridhaNumber} placeholder="Ex: FRIDHA-NOT-2025-0819" />
</div>}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
<div className="flex items-center justify-between gap-2 px-3 py-2 rounded-[var(--r-ctl,12px)] bg-[#F5F1EC] dark:bg-[#292624]">
<span className="t-small font-medium">Certificat de Conformité (Loi 08-15)</span>
<LiveSwitch checked={hasCertificatConformite} onCheckedChange={setHasCertificatConformite} aria-label="Certificat de Conformité (Loi 08-15)" />
</div>
<div className="flex items-center justify-between gap-2 px-3 py-2 rounded-[var(--r-ctl,12px)] bg-[#F5F1EC] dark:bg-[#292624]">
<span className="t-small font-medium">Dossier Éligible Crédit Bancaire</span>
<LiveSwitch checked={isEligibleBankMortgage} onCheckedChange={setIsEligibleBankMortgage} aria-label="Dossier Éligible Crédit Bancaire" />
</div>
</div>
</>}
<div className="flex items-center justify-between pt-4 border-t border-[var(--atr-divider)]">
{activeTab === "general" ? /* @__PURE__ */ <button type="button" onClick={() => setActiveTab("cadastre")} className="t-small text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold hover:underline">Passer au Passeport Foncier →</button> : /* @__PURE__ */ <button type="button" onClick={() => setActiveTab("general")} className="t-small text-black/70 dark:text-white/75 font-semibold hover:underline">← Retour au Descriptif</button>}
<div className="flex items-center gap-2">
<AtriumButton variant="secondary" onClick={onClose} type="button">Annuler</AtriumButton>
<AtriumButton variant="primary" icon={<CheckCircle size={14} />} type="submit">Enregistrer le Bien</AtriumButton>
</div>
</div>
</form>
			</div>
		</KineticModalShell>
	);
};

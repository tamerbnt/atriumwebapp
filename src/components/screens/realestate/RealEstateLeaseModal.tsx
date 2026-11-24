import React, { useState } from 'react';
import { Key, X } from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
} from '../../../services/store';
import { RealEstateProperty, RealEstateLease } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { KineticModalShell } from '../../ui/kinetic';

interface RealEstateLeaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: RealEstateProperty[];
  onSave: (lease: RealEstateLease) => void;
}



export const RealEstateLeaseModal: React.FC<RealEstateLeaseModalProps> = ({ isOpen, onClose, properties, onSave }) => {
	const { language, currentBusiness, currentBranch, currentUser } = useAtriumSelector(
	  (s) => ({
	    language: s.language,
	    currentBusiness: selectCurrentBusinessFromState(s),
	    currentBranch: selectCurrentBranchFromState(s),
	    currentUser: s.currentUser,
	  }),
	  shallowEqualObjects
	);
	const [propertyId, setPropertyId] = React.useState(properties[0]?.id || "");
	const [tenantName, setTenantName] = React.useState("");
	const [tenantPhone, setTenantPhone] = React.useState("");
	const [startDate, setStartDate] = React.useState("2026-06-01");
	const [endDate, setEndDate] = React.useState("2027-05-31");
	const [monthlyRent, setMonthlyRent] = React.useState("180000");
	const [deposit, setDeposit] = React.useState("360000");
	const [frequency, setFrequency] = React.useState("Annual");
	React.useEffect(() => {
		if (!isOpen) return;
		setPropertyId(properties[0]?.id || "");
		setTenantName("");
		setTenantPhone("");
		setStartDate("2026-06-01");
		setEndDate("2027-05-31");
		setMonthlyRent("180000");
		setDeposit("360000");
		setFrequency("Annual");
	}, [isOpen]);
	const handleSubmit = (e: any) => {
		e.preventDefault();
		const prop = properties.find((p: any) => p.id === propertyId) || properties[0];
		if (!tenantName.trim() || !prop) {
			showToast("Veuillez renseigner le locataire et sélectionner un bien", "error");
			return;
		}
		onSave({
			id: `lease_${Date.now()}`,
			accountId: "acc_01",
			businessId: currentBusiness?.id || "biz_realestate",
			branchId: currentBranch?.id || "branch_realestate_main",
			staffId: currentUser?.id || "staff_01",
			propertyId: prop.id,
			propertyTitle: prop.title,
			tenantName: tenantName.trim(),
			tenantPhone: tenantPhone.trim(),
			startDate,
			endDate,
			monthlyRentDzd: parseFloat(monthlyRent) || 1e5,
			securityDepositDzd: parseFloat(deposit) || 2e5,
			agencyCommissionDzd: parseFloat(monthlyRent) || 1e5,
			status: "Active",
			paymentFrequency: frequency
		});
		onClose();
	};
	const propOptions = properties.map((p: any) => ({
		value: p.id,
		label: `${p.title} (${p.cityWilaya})`
	}));
	return (
		<KineticModalShell
			isOpen={isOpen}
			onClose={onClose}
			maxWidthClass="max-w-lg"
			scrimClassName="bg-black/50"
			ariaLabel={language === "ar" ? "تحرير عقد كراء جديد" : "Nouveau Bail de Location"}
		>
			<div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] w-full p-6 [--sq-stroke:var(--sq-stroke-pop)] space-y-5">
<div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3">
<div className="flex items-center gap-2">
<div data-sq="ctl-sm" data-sq-border="none" className="w-8 h-8 bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold"><Key size={16} /></div>
<h3 className="font-semibold t-label text-black dark:text-white">{language === "ar" ? "تحرير عقد كراء جديد" : "Nouveau Bail de Location"}</h3>
</div>
<button type="button" onClick={onClose} aria-label="Fermer" data-sq="ctl-sm" data-sq-border="none" className="w-8 h-8 flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"><X size={16} /></button>
</div>
<form onSubmit={handleSubmit} className="space-y-4">
<LabelSelect label={language === "ar" ? "العقار المؤجر" : "Bien loué"} value={propertyId} onChange={setPropertyId} options={propOptions} />
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
<LabelInput label={language === "ar" ? "اسم المستأجر" : "Locataire (Preneur)"} value={tenantName} onChange={setTenantName} placeholder="Ex: Anis Belhadj" required />
<LabelInput label={language === "ar" ? "هاتف المستأجر" : "Téléphone"} value={tenantPhone} onChange={setTenantPhone} placeholder="0555..." />
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
<LabelInput label={language === "ar" ? "تاريخ بداية العقد" : "Date de début"} type="date" value={startDate} onChange={setStartDate} />
<LabelInput label={language === "ar" ? "تاريخ نهاية العقد" : "Date d'échéance"} type="date" value={endDate} onChange={setEndDate} />
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
<LabelInput label={language === "ar" ? "الكراء الشهري (د.ج)" : "Loyer / mois (DA)"} type="number" value={monthlyRent} onChange={setMonthlyRent} />
<LabelInput label={language === "ar" ? "مبلغ الضمان (Caution)" : "Dépôt de garantie"} type="number" value={deposit} onChange={setDeposit} />
<LabelSelect label={language === "ar" ? "دورية الدفع" : "Périodicité"} value={frequency} onChange={setFrequency} options={[
									{
										value: "Monthly",
										label: language === "ar" ? "شهري" : "Mensuel"
									},
									{
										value: "Quarterly",
										label: language === "ar" ? "فصلي (3 أشهر)" : "Trimestriel"
									},
									{
										value: "Semiannual",
										label: language === "ar" ? "سداسي (6 أشهر)" : "Semestriel"
									},
									{
										value: "Annual",
										label: language === "ar" ? "سنوي (مسبق)" : "Annuel d'avance"
									}
								]} />
</div>
<div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--atr-divider)]">
<AtriumButton type="button" variant="secondary" onClick={onClose}>{language === "ar" ? "إلغاء" : "Annuler"}</AtriumButton>
<AtriumButton type="submit" variant="primary" icon={<Key size={14} />}>{language === "ar" ? "تحرير العقد" : "Établir le Contrat"}</AtriumButton>
</div>
</form>
			</div>
		</KineticModalShell>
	);
};

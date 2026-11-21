import React, { useState } from 'react';
import { Package, ShieldCheck, CheckCircle2, X, Phone, User, KeyRound, Receipt, AlertCircle } from 'lucide-react';
import { showToast, useAtriumSelector } from '../../../services/store';
import { LogisticsShipment } from '../../../types';
import { computeAlgerianFiscalStamp } from '../../../utils/logisticsRules';
import { formatMoney } from '../../../utils/rules';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';

interface StopDeskHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: LogisticsShipment;
  onConfirmDelivery: (shipmentId: string, recipientIdNumber: string) => void;
}



export const StopDeskHandoverModal: React.FC<StopDeskHandoverModalProps> = ({ isOpen, onClose, shipment, onConfirmDelivery }) => {
	const language = useAtriumSelector((s) => s.language);
	const isAr = language === "ar";
	const [enteredOtp, setEnteredOtp] = React.useState("");
	const [idType, setIdType] = React.useState("CNI_Biometrique");
	const [idNumber, setIdNumber] = React.useState("");
	const [otpError, setOtpError] = React.useState(false);
	if (!isOpen) return null;
	const stampDuty = computeAlgerianFiscalStamp(shipment.codAmountDzd);
	const totalToCollect = shipment.codAmountDzd + stampDuty;
	const expectedOtp = shipment.pickupOtpCode || "1234";
	const handleSubmit = (e: any) => {
		e.preventDefault();
		if (enteredOtp.trim() !== expectedOtp) {
			setOtpError(true);
			showToast(isAr ? "رمز OTP غير مطابق. تأكد من الرسالة القصيرة للمستلم" : "Code OTP erroné", "error");
			return;
		}
		if (!idNumber.trim()) {
			showToast(isAr ? "يرجى إدخال رقم بطاقة التعريف أو الوثيقة الثبوتية" : "Numéro de pièce d'identité requis", "error");
			return;
		}
		onConfirmDelivery(shipment.id, idNumber.trim());
		showToast(isAr ? `تم تسليم الطرد ${shipment.trackingCode} بنجاح وقبض المبلغ` : `Colis ${shipment.trackingCode} remis au client`, "success");
		onClose();
	};
	return /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
<div className="sq-elev-pop max-w-lg w-full">
<div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] w-full p-6 [--sq-stroke:var(--sq-stroke-pop)] space-y-4 max-h-[90vh] flex flex-col">
<div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3 shrink-0">
<div className="flex items-center gap-2">
<div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-semibold"><KeyRound size={22} /></div>
<div>
<h3 className="font-semibold t-card text-black dark:text-white">
{isAr ? "تسليم الطرد للزبون بالمكتب (Stop-Desk)" : "Remise Colis au Guichet Stop-Desk"}
</h3>
<p className="t-cap text-black/55 dark:text-white/55">
{"AWB: "}
<span className="tabular-nums font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{shipment.trackingCode}</span>
</p>
</div>
</div>
<button type="button" aria-label={isAr ? "إغلاق" : "Fermer"} onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"><X size={18} /></button>
</div>
<div data-sq="card" data-sq-border="none" className="p-4 bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between">
<div className="flex items-center gap-2">
<Package size={18} className="text-amber-600 dark:text-amber-400" />
<div>
<span className="t-small text-amber-700 dark:text-amber-300 font-medium block">{isAr ? "موقع الطرد على الرف" : "Emplacement Rayonnage"}</span>
<span className="t-card font-semibold tabular-nums text-amber-900 dark:text-amber-200">{shipment.stopDeskShelfCode || "RACK-A-01"}</span>
</div>
</div>
<div className="text-right">
<span className="t-cap text-black/55 dark:text-white/55 block">{isAr ? "الوزن الإجمالي" : "Poids Colis"}</span>
<span className="t-label font-semibold tabular-nums text-black dark:text-white">
{shipment.weightKg}
{" kg"}
</span>
</div>
</div>
<form onSubmit={handleSubmit} className="overflow-y-auto flex-1 space-y-4 pr-1">
<div data-sq="card" data-sq-border="none" className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] space-y-1">
<div className="t-label font-semibold text-black dark:text-white">{shipment.recipientName}</div>
<div className="t-cap text-black/55 dark:text-white/55">
{shipment.recipientPhone}
{" • "}
{shipment.destinationWilaya}
</div>
</div>
<div className="space-y-2">
<label className="block t-small font-semibold text-black dark:text-white">{isAr ? "رمز التحقق السري (SMS OTP)" : "Code de Retrait OTP (4 Chiffres)"}</label>
<div className="flex items-center gap-2">
<div data-sq="ctl" data-sq-border="none" className={`w-full bg-[#F5F1EC] dark:bg-[#2B2825] transition-shadow ${otpError ? "ring-2 ring-red-500/60" : "focus-within:ring-2 focus-within:ring-[#d4522f]/30"}`}>
<input type="text" maxLength={6} value={enteredOtp} onChange={(e) => {
											setEnteredOtp(e.target.value);
											setOtpError(false);
										}} placeholder="Ex: 7492" className={`lbi-field w-full bg-transparent border-0 px-4 py-2 text-center tabular-nums t-pod font-semibold ${otpError ? "text-red-600" : ""}`} required />
</div>
<span className="t-cap text-black/55 dark:text-white/55 tabular-nums shrink-0">
{"(Test: "}
{expectedOtp}
)
</span>
</div>
{otpError && /* @__PURE__ */ <span className="t-cap text-red-600 block">{isAr ? "الرمز غير صحيح" : "Code OTP incorrect"}</span>}
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
<LabelSelect label={isAr ? "نوع وثيقة الهوية" : "Pièce d'Identité"} value={idType} onChange={(val) => setIdType(val)} options={[
									{
										value: "CNI_Biometrique",
										label: isAr ? "بطاقة التعريف الوطنية البيومترية" : "CNI Biométrique"
									},
									{
										value: "Permis",
										label: isAr ? "رخصة السياقة" : "Permis de Conduire"
									},
									{
										value: "Passeport",
										label: isAr ? "جواز السفر" : "Passeport"
									}
								]} />
<LabelInput label={isAr ? "رقم الوثيقة الثبوتية" : "Numéro de la Pièce"} value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="Ex: 1192837401" required />
</div>
<div data-sq="card" data-sq-border="none" data-surface="dark" className="p-4 bg-[#191716] text-white space-y-2">
<div className="flex justify-between t-cap text-white/80">
<span>{isAr ? "مبلغ السلعة COD" : "Montant Colis (COD)"}</span>
<span className="tabular-nums">{formatMoney(shipment.codAmountDzd, language)}</span>
</div>
<div className="flex justify-between t-cap text-white/80">
<span>{isAr ? "طابع المادة 317 (نقداً)" : "Droit de Timbre (Art. 317)"}</span>
<span className="tabular-nums">
{stampDuty}
{" DZD"}
</span>
</div>
<div className="pt-2 border-t border-white/[0.12] flex justify-between t-label font-semibold">
<span>{isAr ? "إجمالي المقبوض من الزبون" : "Net à Encaisser"}</span>
<span className="tabular-nums text-emerald-400">{formatMoney(totalToCollect, language)}</span>
</div>
</div>
<div className="flex items-center justify-between pt-2 border-t border-[var(--atr-divider)] shrink-0">
<AtriumButton variant="ghost" size="sm" type="button" onClick={onClose}>{isAr ? "إلغاء" : "Annuler"}</AtriumButton>
<AtriumButton variant="primary" size="sm" type="submit" icon={<CheckCircle2 size={14} />}>{isAr ? "تسليم الطرد وقبض المبلغ" : "Valider la Remise"}</AtriumButton>
</div>
</form>
</div>
</div>
</div>;
};

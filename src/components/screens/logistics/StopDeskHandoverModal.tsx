import React, { useState } from 'react';
import { Package, ShieldCheck, CheckCircle2, X, Phone, User, KeyRound, Receipt, AlertCircle } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
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
	const { language } = useAtriumStore();
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
<div className="bg-white dark:bg-neutral-900 rounded-[28px] max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 max-h-[90vh] flex flex-col">
<div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 shrink-0">
<div className="flex items-center gap-2.5">
<div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold"><KeyRound size={22} /></div>
<div>
<h3 className="font-bold text-base text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{isAr ? "تسليم الطرد للزبون بالمكتب (Stop-Desk)" : "Remise Colis au Guichet Stop-Desk"}
</h3>
<p className="text-xs text-black/55 dark:text-white/55">
{"AWB: "}
<span className="font-mono font-bold text-[#d4522f]">{shipment.trackingCode}</span>
</p>
</div>
</div>
<button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white"><X size={18} /></button>
</div>
<div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
<div className="flex items-center gap-2">
<Package size={18} className="text-amber-600 dark:text-amber-400" />
<div>
<span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium block">{isAr ? "موقع الطرد على الرف" : "Emplacement Rayonnage"}</span>
<span className="text-base font-black font-mono text-amber-900 dark:text-amber-200">{shipment.stopDeskShelfCode || "RACK-A-01"}</span>
</div>
</div>
<div className="text-right">
<span className="text-[11px] text-black/55 dark:text-white/55 block">{isAr ? "الوزن الإجمالي" : "Poids Colis"}</span>
<span className="text-sm font-bold font-mono text-black dark:text-white">
{shipment.weightKg}
{" kg"}
</span>
</div>
</div>
<form onSubmit={handleSubmit} className="overflow-y-auto flex-1 space-y-4 pr-1">
<div className="p-3.5 rounded-2xl bg-[#F3EDE7] dark:bg-neutral-800/60 border border-[#E6DED6] dark:border-neutral-700/60 space-y-1">
<div className="text-sm font-bold text-black dark:text-white">{shipment.recipientName}</div>
<div className="text-xs text-black/55 dark:text-white/55">
{shipment.recipientPhone}
{" • "}
{shipment.destinationWilaya}
</div>
</div>
<div className="space-y-1.5">
<label className="block text-xs font-bold text-black dark:text-white">{isAr ? "رمز التحقق السري (SMS OTP)" : "Code de Retrait OTP (4 Chiffres)"}</label>
<div className="flex items-center gap-2">
<input type="text" maxLength={6} value={enteredOtp} onChange={(e) => {
											setEnteredOtp(e.target.value);
											setOtpError(false);
										}} placeholder="Ex: 7492" className={`w-full px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border text-center font-mono text-lg font-black tracking-widest ${otpError ? "border-red-500 text-red-600" : "border-neutral-200 dark:border-neutral-700 focus:border-[#d4522f]"}`} required />
<span className="text-[11px] text-black/55 dark:text-white/55 font-mono shrink-0">
{"(Test: "}
{expectedOtp}
)
</span>
</div>
{otpError && /* @__PURE__ */ <span className="text-[11px] text-red-600 block">{isAr ? "الرمز غير صحيح" : "Code OTP incorrect"}</span>}
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
<div className="p-3.5 rounded-2xl bg-neutral-900 text-white space-y-2">
<div className="flex justify-between text-xs text-white/80">
<span>{isAr ? "مبلغ السلعة COD" : "Montant Colis (COD)"}</span>
<span className="font-mono">{formatMoney(shipment.codAmountDzd, language)}</span>
</div>
<div className="flex justify-between text-xs text-white/80">
<span>{isAr ? "طابع المادة 317 (نقداً)" : "Droit de Timbre (Art. 317)"}</span>
<span className="font-mono">
{stampDuty}
{" DZD"}
</span>
</div>
<div className="pt-2 border-t border-neutral-800 flex justify-between text-sm font-bold">
<span>{isAr ? "إجمالي المقبوض من الزبون" : "Net à Encaisser"}</span>
<span className="font-mono text-emerald-400">{formatMoney(totalToCollect, language)}</span>
</div>
</div>
<div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
<AtriumButton variant="ghost" size="sm" type="button" onClick={onClose}>{isAr ? "إلغاء" : "Annuler"}</AtriumButton>
<AtriumButton variant="primary" size="sm" type="submit" icon={<CheckCircle2 size={14} />}>{isAr ? "تسليم الطرد وقبض المبلغ" : "Valider la Remise"}</AtriumButton>
</div>
</form>
</div>
</div>;
};

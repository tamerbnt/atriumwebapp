import React, { useState } from 'react';
import { Package, ShieldCheck, CheckCircle2, X, KeyRound, Lock, AlertCircle } from 'lucide-react';
import { showToast, useAtriumSelector } from '../../../services/store';
import { LogisticsShipment } from '../../../types';
import { computeAlgerianFiscalStamp } from '../../../utils/logisticsRules';
import { evaluateOtpAttemptLockout, STOP_DESK_MAX_OTP_ATTEMPTS } from '../../../utils/logisticsDepth';
import { logisticsService } from '../../../lib/supabase';
import { formatMoney } from '../../../utils/rules';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { KineticModalShell, useRetainedModalValue } from '../../ui/kinetic';

interface StopDeskHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: LogisticsShipment | null;
  onConfirmDelivery: (shipmentId: string, recipientIdNumber: string) => void;
}

export const StopDeskHandoverModal: React.FC<StopDeskHandoverModalProps> = ({ isOpen, onClose, shipment: rawShipment, onConfirmDelivery }) => {
	const language = useAtriumSelector((s) => s.language);
	const isAr = language === 'ar';
	const shipment = useRetainedModalValue(isOpen ? rawShipment : null);
	const [enteredOtp, setEnteredOtp] = useState('');
	const [idType, setIdType] = useState('CNI_Biometrique');
	const [idNumber, setIdNumber] = useState('');
	const [otpError, setOtpError] = useState<string | null>(null);
	const [attempts, setAttempts] = useState(0);
	const [isLockedOut, setIsLockedOut] = useState(false);
	const [managerPin, setManagerPin] = useState('');
	const [showManagerUnlock, setShowManagerUnlock] = useState(false);

	React.useEffect(() => {
		if (!isOpen) return;
		setEnteredOtp('');
		setIdType('CNI_Biometrique');
		setIdNumber('');
		setOtpError(null);
		setAttempts(rawShipment?.otpAttempts || 0);
		setIsLockedOut(Boolean(rawShipment?.otpLockedUntil));
		setManagerPin('');
		setShowManagerUnlock(false);
	}, [isOpen, rawShipment?.id, rawShipment?.otpAttempts, rawShipment?.otpLockedUntil]);

	const codAmount = shipment?.codAmountDzd || 0;
	const stampDuty = computeAlgerianFiscalStamp(codAmount);
	const totalToCollect = codAmount + stampDuty;
	const expectedOtp = shipment?.pickupOtpCode || '';

	const handleManagerUnlock = (e: React.FormEvent) => {
		e.preventDefault();
		if (!shipment) return;
		if (!idNumber.trim()) {
			showToast(isAr ? 'يرجى إدخال رقم بطاقة التعريف أولاً' : "Numéro de pièce d'identité requis", 'error');
			return;
		}
		if (managerPin.trim().length < 4) {
			showToast(isAr ? 'رمز المشرف يجب أن يتكون من 4 أرقام على الأقل' : 'PIN superviseur (4 chiffres min.) requis', 'error');
			return;
		}
		void logisticsService.verifyStopDeskOtp({
			parcelId: shipment.id,
			enteredOtp: enteredOtp.trim() || 'MANAGER',
			expectedOtp: expectedOtp || 'MANAGER',
			recipientIdNumber: idNumber.trim(),
			managerUnlock: true,
		}).catch(() => {});
		onConfirmDelivery(shipment.id, idNumber.trim());
		showToast(
			isAr ? `تم تسليم الطرد ${shipment.trackingCode} بتفويض المشرف` : `Colis ${shipment.trackingCode} débloqué & remis par superviseur`,
			'success'
		);
		onClose();
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!shipment) return;
		if (isLockedOut) {
			setShowManagerUnlock(true);
			return;
		}
		if (!idNumber.trim()) {
			showToast(isAr ? 'يرجى إدخال رقم بطاقة التعريف أو الوثيقة الثبوتية' : "Numéro de pièce d'identité requis", 'error');
			return;
		}
		const evalResult = evaluateOtpAttemptLockout({
			expectedOtp,
			enteredOtp: enteredOtp.trim(),
			currentAttempts: attempts,
			maxAttempts: STOP_DESK_MAX_OTP_ATTEMPTS,
			isLockedOut,
		});

		void logisticsService.verifyStopDeskOtp({
			parcelId: shipment.id,
			enteredOtp: enteredOtp.trim(),
			expectedOtp,
			recipientIdNumber: idNumber.trim(),
			managerUnlock: false,
		}).catch(() => {});

		if (!evalResult.matched) {
			setAttempts(evalResult.attemptsUsed);
			setIsLockedOut(evalResult.isLockedOut);
			if (evalResult.isLockedOut) {
				setShowManagerUnlock(true);
				setOtpError(
					isAr
						? `تم قفل الاستلام بعد ${STOP_DESK_MAX_OTP_ATTEMPTS} محاولات خاطئة. يتطلب فك القفل من المشرف.`
						: `Guichet verrouillé après ${STOP_DESK_MAX_OTP_ATTEMPTS} tentatives échouées. Déblocage superviseur requis.`
				);
			} else {
				setOtpError(
					isAr
						? `الرمز غير صحيح (${evalResult.remainingAttempts} محاولة متبقية)`
						: `Code OTP incorrect (${evalResult.remainingAttempts} essai(s) restant(s))`
				);
			}
			showToast(isAr ? 'رمز OTP غير مطابق. تأكد من الرسالة القصيرة للمستلم' : 'Code OTP erroné', 'error');
			return;
		}

		onConfirmDelivery(shipment.id, idNumber.trim());
		showToast(isAr ? `تم تسليم الطرد ${shipment.trackingCode} بنجاح وقبض المبلغ` : `Colis ${shipment.trackingCode} remis au client`, 'success');
		onClose();
	};

	return (
		<KineticModalShell
			isOpen={isOpen && Boolean(rawShipment)}
			onClose={onClose}
			maxWidthClass="max-w-lg"
			scrimClassName="bg-black/60"
			ariaLabel={isAr ? 'تسليم الطرد للزبون بالمكتب (Stop-Desk)' : 'Remise Colis au Guichet Stop-Desk'}
		>
			{shipment && (
				<div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] w-full p-6 [--sq-stroke:var(--sq-stroke-pop)] space-y-4 max-h-[90vh] flex flex-col">
					<div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3 shrink-0">
						<div className="flex items-center gap-2">
							<div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-semibold"><KeyRound size={22} /></div>
							<div>
								<h3 className="font-semibold t-card text-black dark:text-white">
									{isAr ? 'تسليم الطرد للزبون بالمكتب (Stop-Desk)' : 'Remise Colis au Guichet Stop-Desk'}
								</h3>
								<p className="t-cap text-black/55 dark:text-white/55">
									{'AWB: '}
									<span className="tabular-nums font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{shipment.trackingCode}</span>
								</p>
							</div>
						</div>
						<button type="button" aria-label={isAr ? 'إغلاق' : 'Fermer'} onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"><X size={18} /></button>
					</div>
					<div data-sq="card" data-sq-border="none" className="p-4 bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Package size={18} className="text-amber-600 dark:text-amber-400" />
							<div>
								<span className="t-small text-amber-700 dark:text-amber-300 font-medium block">{isAr ? 'موقع الطرد على الرف' : 'Emplacement Rayonnage'}</span>
								<span className="t-card font-semibold tabular-nums text-amber-900 dark:text-amber-200">{shipment.stopDeskShelfCode || 'RACK-A-01'}</span>
							</div>
						</div>
						<div className="text-right">
							<span className="t-cap text-black/55 dark:text-white/55 block">{isAr ? 'الوزن الإجمالي' : 'Poids Colis'}</span>
							<span className="t-label font-semibold tabular-nums text-black dark:text-white">
								{shipment.weightKg}
								{' kg'}
							</span>
						</div>
					</div>
					<form onSubmit={handleSubmit} className="overflow-y-auto flex-1 space-y-4 pr-1">
						<div data-sq="card" data-sq-border="none" className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] space-y-1">
							<div className="t-label font-semibold text-black dark:text-white">{shipment.recipientName}</div>
							<div className="t-cap text-black/55 dark:text-white/55">
								{shipment.recipientPhone}
								{' • '}
								{shipment.destinationWilaya}
							</div>
						</div>
						<div className="space-y-1.5">
							<LabelInput
								label={isAr ? 'رمز التحقق السري (SMS OTP)' : 'Code de Retrait OTP (SMS Client)'}
								value={enteredOtp}
								onChange={(v) => {
									setEnteredOtp(v.slice(0, 6));
									setOtpError(null);
								}}
								placeholder="••••"
								disabled={isLockedOut}
								error={otpError || undefined}
								required={!isLockedOut}
							/>
							<div className="flex items-center justify-between t-cap text-black/55 dark:text-white/55">
								<span>
									{isAr
										? `الحد الأقصى: ${STOP_DESK_MAX_OTP_ATTEMPTS} محاولات`
										: `Contrôle sécurité : ${attempts}/${STOP_DESK_MAX_OTP_ATTEMPTS} tentatives`}
								</span>
								{!isLockedOut && (
									<button
										type="button"
										onClick={() => setShowManagerUnlock((v) => !v)}
										className="text-[var(--brand-text,#BF431F)] hover:underline font-medium"
									>
										{isAr ? 'تفويض المشرف' : 'Autorisation Superviseur'}
									</button>
								)}
							</div>
						</div>

						{isLockedOut && (
							<div className="p-3 rounded-[var(--rad-ctl)] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 flex items-start gap-2 text-red-700 dark:text-red-300 t-cap">
								<Lock size={16} className="shrink-0 mt-0.5" />
								<span>
									{isAr
										? 'تم قفل التحقق التلقائي بعد 3 محاولات خاطئة. أدخل رمز المشرف وبطاقة الهوية لإتمام التسليم.'
										: 'Remise OTP verrouillée après 3 échecs. Déblocage par PIN superviseur et contrôle CNI obligatoires.'}
								</span>
							</div>
						)}

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<LabelSelect label={isAr ? 'نوع وثيقة الهوية' : "Pièce d'Identité"} value={idType} onChange={(val) => setIdType(val)} options={[
								{ value: 'CNI_Biometrique', label: isAr ? 'بطاقة التعريف الوطنية البيومترية' : 'CNI Biométrique' },
								{ value: 'Permis', label: isAr ? 'رخصة السياقة' : 'Permis de Conduire' },
								{ value: 'Passeport', label: isAr ? 'جواز السفر' : 'Passeport' },
							]} />
							<LabelInput label={isAr ? 'رقم الوثيقة الثبوتية' : 'Numéro de la Pièce'} value={idNumber} onChange={setIdNumber} placeholder="Ex: 1192837401" required />
						</div>

						{showManagerUnlock && (
							<div data-sq="card" className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 space-y-2">
								<div className="flex items-center gap-1.5 t-cap font-semibold text-amber-800 dark:text-amber-200">
									<AlertCircle size={14} />
									<span>{isAr ? 'فك القفل الاستثنائي بواسطة المشرف' : 'Déblocage Superviseur Stop-Desk'}</span>
								</div>
								<div className="flex items-end gap-2">
									<div className="flex-1">
										<LabelInput
											type="password"
											label={isAr ? 'رمز المشرف السري (4 أرقام)' : 'PIN Superviseur (4 chiffres min.)'}
											value={managerPin}
											onChange={setManagerPin}
											placeholder="••••"
										/>
									</div>
									<AtriumButton type="button" variant="outline" size="sm" onClick={handleManagerUnlock} icon={<ShieldCheck size={14} />}>
										{isAr ? 'فك القفل والتسليم' : 'Débloquer & Remettre'}
									</AtriumButton>
								</div>
							</div>
						)}

						<div data-sq="card" data-sq-border="none" data-surface="dark" className="p-4 bg-[#191716] text-white space-y-2">
							<div className="flex justify-between t-cap text-white/80">
								<span>{isAr ? 'مبلغ السلعة COD' : 'Montant Colis (COD)'}</span>
								<span className="tabular-nums">{formatMoney(shipment.codAmountDzd, language)}</span>
							</div>
							<div className="flex justify-between t-cap text-white/80">
								<span>{isAr ? 'طابع المادة 317 (نقداً)' : 'Droit de Timbre (Art. 317)'}</span>
								<span className="tabular-nums">
									{stampDuty}
									{' DZD'}
								</span>
							</div>
							<div className="pt-2 border-t border-white/[0.12] flex justify-between t-label font-semibold">
								<span>{isAr ? 'إجمالي المقبوض من الزبون' : 'Net à Encaisser'}</span>
								<span className="tabular-nums text-emerald-400">{formatMoney(totalToCollect, language)}</span>
							</div>
						</div>
						<div className="flex items-center justify-between pt-2 border-t border-[var(--atr-divider)] shrink-0">
							<AtriumButton variant="ghost" size="sm" type="button" onClick={onClose}>{isAr ? 'إلغاء' : 'Annuler'}</AtriumButton>
							<AtriumButton variant="primary" size="sm" type="submit" disabled={isLockedOut} icon={<CheckCircle2 size={14} />}>
								{isAr ? 'تسليم الطرد وقبض المبلغ' : 'Valider la Remise'}
							</AtriumButton>
						</div>
					</form>
				</div>
			)}
		</KineticModalShell>
	);
};

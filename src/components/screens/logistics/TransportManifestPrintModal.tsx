import React from 'react';
import { Printer, X, ShieldCheck } from 'lucide-react';
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
  selectCurrentBusinessConfigFromState,
} from '../../../services/store';
import { LogisticsManifest } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { buildUnifiedFiscalHeader } from '../../../utils/invoicingEngine';
import { AtriumButton } from '../../ui/AtriumButton';
import { KineticModalShell, useRetainedModalValue } from '../../ui/kinetic';

interface TransportManifestPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  manifest: LogisticsManifest | null;
}

export const TransportManifestPrintModal: React.FC<TransportManifestPrintModalProps> = ({ isOpen, onClose, manifest: rawManifest }) => {
	const { language, currentBusiness, currentBranch, currentBusinessConfig } = useAtriumSelector(
	  (s) => ({
	    language: s.language,
	    currentBusiness: selectCurrentBusinessFromState(s),
	    currentBranch: selectCurrentBranchFromState(s),
	    currentBusinessConfig: selectCurrentBusinessConfigFromState(s),
	  }),
	  shallowEqualObjects
	);
	const fiscalHeader = React.useMemo(
	  () => buildUnifiedFiscalHeader(currentBusiness, currentBranch, currentBusinessConfig),
	  [currentBusiness, currentBranch, currentBusinessConfig]
	);
	const isAr = language === 'ar';
	const isEn = language === 'en';
	const manifest = useRetainedModalValue(isOpen ? rawManifest : null);
	const handlePrint = () => {
		window.print();
	};
	const offlineHash = manifest ? `ALG-LVR-SEC-${manifest.manifestNumber}-${manifest.vehiclePlate}-${manifest.totalShipmentsCount}` : '';
	return (
		<KineticModalShell
			isOpen={isOpen && Boolean(rawManifest)}
			onClose={onClose}
			maxWidthClass="max-w-3xl"
			scrimClassName="bg-black/60"
			ariaLabel={isAr ? 'بيان الشحن القانوني (المرسوم التنفيذي 05-468)' : isEn ? 'Road Waybill (Decree 05-468)' : 'Lettre de Voiture Routière (Décret 05-468)'}
		>
			{manifest && (
				<div data-sq="panel" data-sq-border="solid" dir={isAr ? 'rtl' : 'ltr'} className="bg-white dark:bg-[#262422] w-full p-6 [--sq-stroke:var(--sq-stroke-pop)] space-y-4 max-h-[95vh] flex flex-col print:p-0 print:shadow-none print:max-h-none">
					<div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3 shrink-0 print:hidden">
						<div className="flex items-center gap-2">
							<ShieldCheck size={20} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
							<h3 className="font-semibold t-label text-black dark:text-white">
								{isAr ? 'بيان الشحن القانوني (المرسوم التنفيذي 05-468)' : isEn ? 'Road Waybill (Decree 05-468)' : 'Lettre de Voiture Routière (Décret 05-468)'}
							</h3>
						</div>
						<div className="flex items-center gap-2">
							<AtriumButton variant="primary" size="sm" onClick={handlePrint} icon={<Printer size={14} />}>{isAr ? 'طباعة الوثيقة' : isEn ? 'Print A4' : 'Imprimer'}</AtriumButton>
							<button type="button" aria-label={isAr ? 'إغلاق' : isEn ? 'Close' : 'Fermer'} onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"><X size={18} /></button>
						</div>
					</div>
					<div className="printable-document overflow-y-auto flex-1 p-6 bg-white text-black border border-black/[0.14] rounded-[var(--r-card,16px)] space-y-6 font-sans t-cap print:border-0 print:p-4">
						<div className="text-center border-b pb-4 border-black/30 space-y-1">
							<div className="font-semibold t-small">الجمهورية الجزائرية الديمقراطية الشعبية</div>
							<div className="font-semibold t-small text-black/75">RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE — MINISTÈRE DES TRANSPORTS</div>
							<div className="t-card font-semibold pt-1 text-black">
								{isAr ? `ورقة الطريق / بيان الشحن رقم ${manifest.manifestNumber}` : isEn ? `ROAD FREIGHT WAYBILL N° ${manifest.manifestNumber}` : `LETTRE DE VOITURE ROUTIÈRE N° ${manifest.manifestNumber}`}
							</div>
							<div className="t-small text-black/75 font-medium">
								{isAr ? 'مطابق لأحكام المرسوم التنفيذي رقم 05-468 المؤرخ في 10 ديسمبر 2005' : isEn ? 'Compliant with Executive Decree N° 05-468 of December 10, 2005' : 'Conforme aux dispositions du Décret Exécutif N° 05-468 du 10 Décembre 2005'}
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4 border p-3 rounded-[var(--r-ctl,12px)] border-black/[0.14]">
							<div>
								<div className="font-semibold t-small border-b pb-1 mb-2 text-black">
									{isAr ? '1. مؤسسة النقل والبريد السريع' : isEn ? '1. Transport & Courier Carrier' : '1. Entreprise de Transport & Messagerie'}
								</div>
								<div className="space-y-0.5">
									<div>
										<span className="font-semibold">{isAr ? 'التسمية:' : isEn ? 'Business Name:' : 'Raison Sociale:'}</span>{' '}
										{currentBusiness?.name || '—'}
									</div>
									<div>
										<span className="font-semibold">NIF:</span>{' '}{fiscalHeader.nif || '—'} {' • '}
										<span className="font-semibold">RC:</span>{' '}{fiscalHeader.rc || '—'}
									</div>
									<div>
										<span className="font-semibold">{isAr ? 'رخصة النقل:' : isEn ? 'Transport License:' : 'Licence de Transport:'}</span>{' '}
										{manifest.transportCardNumber || '—'}
									</div>
									<div>
										<span className="font-semibold">{isAr ? 'مركز الإرسال:' : isEn ? 'Origin Hub:' : "Hub d'Émission:"}</span>{' '}
										{manifest.originHub || '—'}
									</div>
								</div>
							</div>
							<div>
								<div className="font-semibold t-small border-b pb-1 mb-2 text-black">
									{isAr ? '2. السائق والمركبة المكلفة' : isEn ? '2. Assigned Driver & Vehicle' : '2. Chauffeur & Véhicule Affecté'}
								</div>
								<div className="space-y-0.5">
									<div>
										<span className="font-semibold">{isAr ? 'الاسم واللقب:' : isEn ? 'Driver:' : 'Nom & Prénom:'}</span>{' '}
										{manifest.driverName || '—'}
									</div>
									<div>
										<span className="font-semibold">NIN:</span>{' '}
										{manifest.driverNin || '—'}
									</div>
									<div>
										<span className="font-semibold">{isAr ? 'الهاتف:' : isEn ? 'Phone:' : 'Téléphone:'}</span>{' '}
										{manifest.driverPhone || '—'}
									</div>
									<div>
										<span className="font-semibold">{isAr ? 'ترقيم المركبة:' : isEn ? 'Plate:' : 'Matricule Véhicule:'}</span>{' '}
										<span className="tabular-nums font-semibold">{manifest.vehiclePlate || '—'}</span>
									</div>
								</div>
							</div>
						</div>
						<div className="border p-3 rounded-[var(--r-ctl,12px)] border-black/[0.14] space-y-2">
							<div className="font-semibold t-small border-b pb-1 text-black flex justify-between">
								<span>{isAr ? '3. تفاصيل الحمولة والوجهة' : isEn ? '3. Freight & Destination Summary' : '3. Descriptif du Fret & Destination'}</span>
								<span>{isAr ? 'التاريخ: ' : 'Date: '}{manifest.dispatchDate}</span>
							</div>
							<div className="grid grid-cols-3 gap-2 py-1">
								<div>
									<span className="text-black/55 block t-cap">{isAr ? 'منطقة الوجهة:' : isEn ? 'Destination Zone:' : 'Zone de Destination:'}</span>
									<span className="font-semibold">{manifest.zoneWilaya || '—'}</span>
								</div>
								<div>
									<span className="text-black/55 block t-cap">{isAr ? 'مركز الاستلام:' : isEn ? 'Destination Hub:' : 'Hub Réceptionnaire:'}</span>
									<span className="font-semibold">{manifest.destinationHub || '—'}</span>
								</div>
								<div>
									<span className="text-black/55 block t-cap">{isAr ? 'حالة الرحلة:' : isEn ? 'Transit Status:' : 'Statut Transit:'}</span>
									<span className="font-semibold text-emerald-700">{manifest.status}</span>
								</div>
							</div>
							<table className="w-full text-start border-collapse mt-2">
								<thead>
									<tr className="border-y border-black/[0.16] bg-neutral-100 t-cap">
										<th className="p-2 font-semibold">{isAr ? 'التعيين' : isEn ? 'Description' : 'Désignation'}</th>
										<th className="p-2 font-semibold">{isAr ? 'أكياس الشحن' : isEn ? 'Shuttle Bags' : 'Sacs-Navette (Bags)'}</th>
										<th className="p-2 font-semibold">{isAr ? 'أرقام الأختام الأمنية' : isEn ? 'Security Seals' : 'Numéros Scellés de Sécurité'}</th>
										<th className="p-2 font-semibold text-end">{isAr ? 'الوزن الإجمالي' : isEn ? 'Gross Weight' : 'Poids Brut'}</th>
										<th className="p-2 font-semibold text-end">{isAr ? 'قيمة COD المصرحة' : isEn ? 'Declared COD' : 'Valeur Déclarée COD'}</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-black/[0.10]">
									<tr>
										<td className="p-2 font-medium">
											{isAr ? `طرود بريد سريع (${manifest.totalShipmentsCount} طرد)` : isEn ? `E-commerce & Courier Parcels (${manifest.totalShipmentsCount})` : `Colis E-commerce & Messagerie (${manifest.totalShipmentsCount} colis)`}
										</td>
										<td className="p-2 tabular-nums">{manifest.bagIds && manifest.bagIds.length > 0 ? manifest.bagIds.join(', ') : '—'}</td>
										<td className="p-2 tabular-nums font-semibold text-[var(--brand-text,#BF431F)]">{manifest.sealNumbers && manifest.sealNumbers.length > 0 ? manifest.sealNumbers.join(', ') : '—'}</td>
										<td className="p-2 text-end tabular-nums">
											{manifest.totalGrossWeightKg ?? 0}
											{' kg'}
										</td>
										<td className="p-2 text-end tabular-nums font-semibold">{formatMoney(manifest.totalCodExpectedDzd, language)}</td>
									</tr>
								</tbody>
							</table>
						</div>
						<div className="grid grid-cols-3 gap-3 pt-3 items-end">
							<div className="border p-3 rounded-[var(--r-ctl,12px)] border-black/[0.14] h-28 flex flex-col justify-between">
								<span className="font-semibold t-small text-black/75">{isAr ? 'تأشيرة وختم مركز الانطلاق' : isEn ? 'Origin Hub Stamp & Sign' : 'Visa & Cachet Hub Émetteur'}</span>
								<div className="t-cap text-black/55 italic">{manifest.originHub || (isAr ? 'توقيع المسؤول' : 'Signature responsable')}</div>
							</div>
							<div className="border p-3 rounded-[var(--r-ctl,12px)] border-black/[0.14] h-28 flex flex-col justify-between">
								<span className="font-semibold t-small text-black/75">{isAr ? 'إمضاء السائق الناقل' : isEn ? 'Driver Signature' : 'Signature Chauffeur Transporteur'}</span>
								<div className="t-cap text-black/55 italic">{isAr ? 'إقرار باستلام الحمولة' : isEn ? 'Cargo custody acknowledgement' : 'Reconnaissance de prise en charge'}</div>
							</div>
							<div className="border p-2 rounded-[var(--r-ctl,12px)] border-black/[0.14] h-28 flex flex-col items-center justify-center text-center bg-neutral-50">
								<div className="w-14 h-14 bg-black/10 rounded-[var(--r-ctl-sm,10px)] flex items-center justify-center tabular-nums t-cap text-black/75 p-1">[QR 05-468]</div>
								<span className="tabular-nums t-cap text-black/55 mt-1 truncate max-w-full">{offlineHash}</span>
								<span className="t-small font-semibold text-emerald-700">{isAr ? 'تحقق قانوني ساري' : isEn ? 'Road Control Valid' : 'Contrôle Routier Validé'}</span>
							</div>
						</div>
						<div className="t-cap text-black/55 text-center pt-2">
							{isAr
								? 'وثيقة رسمية تُقدَّم عند كل طلب من مصالح الدرك الوطني، الأمن الوطني ومراقبة النقل.'
								: isEn
								? 'Official document to be presented upon inspection by National Gendarmerie, National Police, or Transport Inspectors.'
								: 'Document officiel à présenter à toute réquisition des services de Gendarmerie Nationale, Sûreté Nationale et Contrôle des Transports.'}
						</div>
					</div>
				</div>
			)}
		</KineticModalShell>
	);
};

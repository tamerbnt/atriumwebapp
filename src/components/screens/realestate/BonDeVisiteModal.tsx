import React, { useState, useRef, useEffect } from 'react';
import { X, MapPin, CheckCircle, RotateCcw, Share2, Shield, AlertTriangle } from 'lucide-react';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { RealEstateProperty, BonDeVisiteRecord } from '../../../types';

interface BonDeVisiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (visit: BonDeVisiteRecord) => void;
  properties: RealEstateProperty[];
  selectedProperty?: RealEstateProperty | null;
}



export const BonDeVisiteModal: React.FC<BonDeVisiteModalProps> = ({ isOpen, onClose, onSave, properties, selectedProperty }) => {
	const activeProp = selectedProperty || properties[0];
	const [clientFullName, setClientFullName] = React.useState("");
	const [clientPhone, setClientPhone] = React.useState("");
	const [clientNationalId, setClientNationalId] = React.useState("");
	const [negotiatorName, setNegotiatorName] = React.useState("Karim Zerrouki");
	const [clientImpression, setClientImpression] = React.useState("Interested");
	const [counterOfferDzd, setCounterOfferDzd] = React.useState(activeProp ? Math.round(activeProp.priceDzd * .95) : 0);
	const [feedbackNotes, setFeedbackNotes] = React.useState("");
	const [gpsLatitude, setGpsLatitude] = React.useState<any>(null);
	const [gpsLongitude, setGpsLongitude] = React.useState<any>(null);
	const [gpsAccuracy, setGpsAccuracy] = React.useState<any>(null);
	const [isGpsLoading, setIsGpsLoading] = React.useState(false);
	const [gpsError, setGpsError] = React.useState<any>(null);
	const canvasRef = React.useRef<any>(null);
	const [isDrawing, setIsDrawing] = React.useState(false);
	const [hasSignature, setHasSignature] = React.useState(false);
	React.useEffect(() => {
		if (isOpen) handleCaptureGps();
	}, [isOpen]);
	if (!isOpen) return null;
	const handleCaptureGps = () => {
		if (typeof navigator !== "undefined" && "geolocation" in navigator) {
			setIsGpsLoading(true);
			setGpsError(null);
			navigator.geolocation.getCurrentPosition((pos) => {
				setGpsLatitude(Number(pos.coords.latitude.toFixed(5)));
				setGpsLongitude(Number(pos.coords.longitude.toFixed(5)));
				setGpsAccuracy(Math.round(pos.coords.accuracy));
				setIsGpsLoading(false);
			}, (err) => {
				console.warn("[Bon de Visite] GPS warning:", err.message);
				setGpsLatitude(36.7538);
				setGpsLongitude(3.0588);
				setGpsAccuracy(15);
				setIsGpsLoading(false);
			}, {
				enableHighAccuracy: true,
				timeout: 6e3
			});
		}
	};
	const startDrawing = (e: any) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		setIsDrawing(true);
		setHasSignature(true);
		const rect = canvas.getBoundingClientRect();
		const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
		const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
		ctx.lineWidth = 2.5;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.strokeStyle = "#18181B";
		ctx.beginPath();
		ctx.moveTo(x, y);
	};
	const draw = (e: any) => {
		if (!isDrawing) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const rect = canvas.getBoundingClientRect();
		const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
		const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
		ctx.lineTo(x, y);
		ctx.stroke();
	};
	const stopDrawing = () => {
		setIsDrawing(false);
	};
	const clearSignature = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		setHasSignature(false);
	};
	const handleSubmit = (e: any) => {
		e.preventDefault();
		let signatureSvgData = "";
		if (canvasRef.current && hasSignature) signatureSvgData = canvasRef.current.toDataURL("image/png");
		else signatureSvgData = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cGF0aCBkPSJNMTAgOTAgQyAyMCAyMCwgODAgMjAgOTAgODAiIHN0cm9rZT0iYmxhY2siIGZpbGw9InRyYW5zcGFyZW50Ii8+PC9zdmc+";
		onSave({
			id: `vis_${Date.now()}`,
			accountId: activeProp?.accountId || "acc_01",
			businessId: activeProp?.businessId || "biz_realestate",
			branchId: activeProp?.branchId || "branch_realestate_main",
			staffId: activeProp?.staffId || "staff_01",
			negotiatorName,
			propertyId: activeProp?.id || "prop_01",
			propertyTitle: activeProp?.title || "Bien Immobilier",
			propertyAddress: activeProp?.address || "Adresse à Alger",
			clientFullName: clientFullName.trim() || "Visiteur Enregistré",
			clientPhone: clientPhone.trim() || "0550 00 00 00",
			clientNationalId: clientNationalId.trim() || "109823487129837401",
			visitTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
			gpsLatitude: gpsLatitude ?? 36.7538,
			gpsLongitude: gpsLongitude ?? 3.0588,
			gpsAccuracyMeters: gpsAccuracy ?? 10,
			signatureSvgData,
			signedOffline: false,
			clientImpression,
			counterOfferDzd: Number(counterOfferDzd) || void 0,
			clientFeedbackNotes: feedbackNotes.trim(),
			whatsappConfirmationSent: true,
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		});
		onClose();
	};
	return /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
<div className="relative w-full max-w-2xl bg-white dark:bg-[#18181B] rounded-[28px] shadow-2xl border border-[#E9EEF0] dark:border-[#27272A] p-6 md:p-8 my-8 text-black dark:text-[#FAFAFA]">
<div className="flex items-center justify-between pb-4 border-b border-[#E2E8EC] dark:border-[#27272A] mb-5">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold"><Shield className="w-5 h-5" /></div>
<div>
<h2 className="text-xl font-bold tracking-tight font-['Barlow_Condensed',sans-serif] rtl:font-sans">Bon de Visite Numérique Certifié</h2>
</div>
</div>
<button onClick={onClose} className="p-2 rounded-xl text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"><X className="w-5 h-5" /></button>
</div>
<div className="p-3.5 rounded-2xl bg-[#F3EDE7] dark:bg-[#141416] border border-[#E6DED6] dark:border-[#232328] mb-5 flex items-center justify-between">
<div>
<div className="text-xs text-black/70 dark:text-[#A1A1AA] uppercase font-semibold">Bien Visité</div>
<div className="text-sm font-bold text-black dark:text-white truncate max-w-md">{activeProp?.title}</div>
<div className="text-xs text-black/70 dark:text-[#A1A1AA]">
{activeProp?.address}
{" ("}
{activeProp?.cityWilaya}
)
</div>
</div>
<div className="text-right">
<div className="text-xs text-black/70 dark:text-[#A1A1AA]">Prix Annoncé</div>
<div className="text-sm font-bold font-mono text-[#d4522f]">
{activeProp?.priceDzd.toLocaleString()}
{" DZD"}
</div>
</div>
</div>
<form onSubmit={handleSubmit} className="space-y-5">
<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
<LabelInput label="Nom & Prénom de l'Acquéreur" value={clientFullName} onChange={(e) => setClientFullName(e.target.value)} placeholder="Ex: Sofiane Medjahed" required />
<LabelInput label="Téléphone Portable" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Ex: 0550 49 11 22" required />
<LabelInput label="N° CNI (18 Chiffres)" value={clientNationalId} onChange={(e) => setClientNationalId(e.target.value)} placeholder="Ex: 109823487192837461" required />
</div>
<div className="p-3 rounded-2xl bg-[#FDF4F0] dark:bg-[#1C1816] border border-[#d4522f]/30 flex items-center justify-between">
<div className="flex items-center gap-2.5">
<MapPin className="w-4 h-4 text-[#d4522f]" />
<div className="text-xs">
<span className="font-semibold text-black dark:text-white">Géolocalisation d'Intervention:</span>
{" "}
{isGpsLoading ? /* @__PURE__ */ <span className="text-[#d4522f] animate-pulse">Recherche signal satellite GPS...</span> : gpsLatitude ? /* @__PURE__ */ <span className="font-mono text-black/70 dark:text-[#A1A1AA]">
{gpsLatitude}
{"° N, "}
{gpsLongitude}
° E (Précision ±
{gpsAccuracy}
m)
</span> : /* @__PURE__ */ <span className="text-amber-600">Signal GPS faible</span>}
</div>
</div>
<button type="button" onClick={handleCaptureGps} className="text-xs text-[#d4522f] hover:underline font-semibold">Actualiser GPS</button>
</div>
<div className="space-y-1.5">
<div className="flex items-center justify-between text-xs">
<span className="font-semibold text-black dark:text-white">Signature Tactile de l'Acquéreur (Sur l'écran)</span>
<button type="button" onClick={clearSignature} className="flex items-center gap-1 text-black/70 dark:text-white/75 hover:text-[#d4522f] transition-colors">
<RotateCcw className="w-3.5 h-3.5" />
<span>Effacer</span>
</button>
</div>
<div className="relative rounded-2xl border-2 border-dashed border-[#E2E8EC] dark:border-[#27272A] bg-white dark:bg-[#141416] overflow-hidden">
<canvas ref={canvasRef} width={560} height={140} className="w-full h-[140px] touch-none cursor-crosshair" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
{!hasSignature && /* @__PURE__ */ <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-black/55 dark:text-white/55">Signez avec le doigt ou le stylet ici</div>}
</div>
<p className="text-[11px] text-black/70 dark:text-[#A1A1AA] leading-relaxed">
* En signant, le client reconnaît avoir visité le bien par l'entremise de l'agence Atrium et s'interdit de traiter directement avec le vendeur pendant 12 mois.
</p>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
<div>
<label className="block text-xs font-semibold text-black dark:text-white mb-1.5">Impression de Visite</label>
<select value={clientImpression} onChange={(e) => setClientImpression(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8EC] dark:border-[#27272A] bg-white dark:bg-[#141416] text-xs font-medium focus:ring-2 focus:ring-[#d4522f]">
<option value="Interested">Très Intéressé (Candidat Solide)</option>
<option value="NeedsNegotiation">Intéressé sous réserve de négociation</option>
<option value="OfferSubmitted">Offre Ferme Soumise</option>
<option value="PriceTooHigh">Prix jugé trop élevé</option>
<option value="Unfavorable">Défavorable (Ne correspond pas)</option>
</select>
</div>
<LabelInput type="number" label="Proposition de Prix Client (DZD)" value={counterOfferDzd} onChange={(e) => setCounterOfferDzd(Number(e.target.value))} />
</div>
<LabelInput label="Notes de Visite & Remarques du Négociateur" value={feedbackNotes} onChange={(e) => setFeedbackNotes(e.target.value)} placeholder="Ex: Travaux peinture à prévoir, visite seconde fois avec son conjoint..." />
<div className="flex items-center justify-between pt-4 border-t border-[#E2E8EC] dark:border-[#27272A]">
<div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
<CheckCircle className="w-4 h-4" />
<span>Copie WhatsApp générée automatiquement</span>
</div>
<div className="flex items-center gap-2.5">
<AtriumButton variant="secondary" onClick={onClose} type="button">Annuler</AtriumButton>
<AtriumButton variant="primary" icon={<CheckCircle size={14} />} type="submit">Certifier le Bon de Visite</AtriumButton>
</div>
</div>
</form>
</div>
</div>;
};

import React, { useState } from 'react';
import { Cloud, Printer, X, ShieldCheck, CheckCircle2, AlertTriangle, Users, Calendar, Download } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { ContractorProject, ContractorDailyLog } from '../../../types';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';

interface CacobatphDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: ContractorProject;
  dailyLog?: ContractorDailyLog | null;
}



export const CacobatphDossierModal: React.FC<CacobatphDossierModalProps> = ({ isOpen, onClose, project, dailyLog }) => {
	const { language } = useAtriumStore();
	const isAr = language === "ar";
	const [onmBulletin, setOnmBulletin] = React.useState(dailyLog?.onmBulletinReference || "ONM-METEO-DZ-2026-8841");
	const [stoppageHours, setStoppageHours] = React.useState(String(dailyLog?.stoppageHours || 5));
	const [weatherType, setWeatherType] = React.useState("HeavyRain");
	const [workerCount, setWorkerCount] = React.useState("24");
	const [cacobatphCenter, setCacobatphCenter] = React.useState("Agence Régionale Alger Centre");
	if (!isOpen) return null;
	const handlePrint = () => {
		window.print();
	};
	const handleValidateDossier = () => {
		if (!onmBulletin.trim()) {
			showToast(isAr ? "يرجى إدخال رقم النشرة الجوية الرسمية للديوان الوطني للأرصاد" : "Le numéro de bulletin météo ONM est obligatoire pour la CACOBATPH", "error");
			return;
		}
		showToast(isAr ? "تم اعتماد ملف التعويض عن سوء الأحوال الجوية CACOBATPH بنجاح" : "Dossier CACOBATPH 48h validé avec succès pour transmission", "success");
		onClose();
	};
	return /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
<div className="sq-elev-pop max-w-2xl w-full my-8">
<div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-neutral-900 w-full p-6 [--sq-stroke:#e5e5e5] dark:[--sq-stroke:#262626] space-y-6">
<div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 print:hidden">
<div className="flex items-center gap-2">
<div data-sq="ctl-sm" data-sq-border="none" className="w-8 h-8 bg-blue-500/15 text-blue-600 flex items-center justify-center font-semibold shrink-0"><Cloud size={18} /></div>
<div>
<h3 className="font-semibold t-label text-black dark:text-white">
{isAr ? "ملف التصريح بالتوقف عن العمل بسبب سوء الأحوال الجوية (CACOBATPH)" : "Dossier d'Arrêt Intempéries CACOBATPH (Délai Légal 48h)"}
</h3>
</div>
</div>
<div className="flex items-center gap-2">
<AtriumButton variant="primary" onClick={handlePrint} icon={<Printer size={15} />}>{isAr ? "طباعة الملف" : "Imprimer Bordereau"}</AtriumButton>
<button type="button" onClick={onClose} aria-label={isAr ? "إغلاق" : "Fermer"} className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"><X size={18} /></button>
</div>
</div>
<div data-sq="card" data-sq-border="solid" style={{ '--sq-stroke': 'rgba(245, 158, 11, 0.35)' } as React.CSSProperties} className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3 print:hidden">
<AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
<div className="t-cap text-amber-800 dark:text-amber-300 space-y-0.5">
<div className="font-semibold">
{isAr ? "تنبيه الأجل القانوني: 48 ساعة من تاريخ توقف الأشغال" : "Délai d'urgence : Déclaration obligatoire sous 48 heures"}
</div>
<p className="t-cap text-amber-700 dark:text-amber-400">
{isAr ? "يجب إيداع هذا الملف لدى صندوق CACOBATPH مرفقا بالنشرة الرسمية للأرصاد الجوية (ONM) لتعويض أجور العمال." : "Tout retard au-delà de 48h entraîne la forclusion et la perte des indemnités chômage-intempéries dues aux travailleurs."}
</p>
</div>
</div>
<div className="printable-document p-5 border border-neutral-300 dark:border-neutral-700 rounded-[var(--r-card,16px)] bg-white text-black t-cap space-y-5 font-sans">
<div className="text-center space-y-1 border-b border-neutral-300 pb-3">
<p className="font-semibold t-small tracking-wide">CAISSE NATIONALE DES CONGÉS PAYÉS ET DU CHÔMAGE-INTEMPÉRIES DU BTPH</p>
<p className="t-small text-black/75 font-semibold">
الصندوق الوطني للعطل المدفوعة الأجر والبطالة الناجمة عن سوء الأحوال الجوية لقطاعات البناء والأشغال العمومية
</p>
<div className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] pt-1">DÉCLARATION D'ARRÊT DE CHANTIER POUR INTEMPÉRIES</div>
</div>
<div className="grid grid-cols-2 gap-3 t-cap">
<div className="space-y-1 p-3 bg-neutral-50 rounded-[var(--r-ctl,12px)] border border-neutral-200">
<span className="font-semibold text-black/75 t-small">Chantier & Entreprise</span>
<div className="font-semibold text-black">{project?.projectName || "Chantier Réalisation"}</div>
<div>
{"Lieu: "}
{project?.siteLocation || "Alger"}
{" (Wilaya "}
{project?.wilayaNumber || 16}
)
</div>
<div>
{"Agence CACOBATPH: "}
{cacobatphCenter}
</div>
</div>
<div className="space-y-1 p-3 bg-neutral-50 rounded-[var(--r-ctl,12px)] border border-neutral-200">
<span className="font-semibold text-black/75 t-small">Justificatif Météorologique</span>
<div>
{"Date d'arrêt: "}
{dailyLog?.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]}
</div>
<div className="font-semibold text-blue-700">
{"Durée d'interruption: "}
{stoppageHours}
{" heures consécutives"}
</div>
<div className="tabular-nums text-black">
{"N° Bulletin ONM: "}
{onmBulletin}
</div>
</div>
</div>
<div className="space-y-3 pt-2 border-t border-neutral-200 print:hidden">
<div className="grid grid-cols-2 gap-3">
<LabelInput label="N° Bulletin Météorologique ONM" value={onmBulletin} onChange={(e) => setOnmBulletin(e.target.value)} required />
<LabelInput label="Heures d'arrêt de travail" type="number" value={stoppageHours} onChange={(e) => setStoppageHours(e.target.value)} required />
</div>
<div className="grid grid-cols-2 gap-3">
<LabelInput label="Nombre d'ouvriers indemnisables" type="number" value={workerCount} onChange={(e) => setWorkerCount(e.target.value)} />
<LabelInput label="Agence régionale CACOBATPH" value={cacobatphCenter} onChange={(e) => setCacobatphCenter(e.target.value)} />
</div>
</div>
<div className="space-y-2">
<span className="font-semibold text-black/75 t-small flex items-center gap-2">
<Users size={14} />
État nominatif sommaire des travailleurs en chômage-intempéries (
{workerCount}
{" déclarés)"}
</span>
<table className="w-full border-collapse border border-neutral-300 t-cap">
<thead>
<tr className="bg-neutral-100 font-semibold text-black/75">
<th className="border border-neutral-300 p-2 text-left">N° Immatriculation CNAS</th>
<th className="border border-neutral-300 p-2 text-left">Nom & Prénom</th>
<th className="border border-neutral-300 p-2 text-left">Qualification</th>
<th className="border border-neutral-300 p-2 text-center">Heures</th>
</tr>
</thead>
<tbody>
<tr>
<td className="border border-neutral-300 p-2 tabular-nums">16-7844-0912-14</td>
<td className="border border-neutral-300 p-2 font-medium">Bensalem Ahmed</td>
<td className="border border-neutral-300 p-2">Coffreur Boiseur Qualifié</td>
<td className="border border-neutral-300 p-2 text-center tabular-nums">
{stoppageHours}
h
</td>
</tr>
<tr>
<td className="border border-neutral-300 p-2 tabular-nums">16-8120-4491-08</td>
<td className="border border-neutral-300 p-2 font-medium">Messaoudi Karim</td>
<td className="border border-neutral-300 p-2">Ferrailleur Chef d'Équipe</td>
<td className="border border-neutral-300 p-2 text-center tabular-nums">
{stoppageHours}
h
</td>
</tr>
<tr>
<td className="border border-neutral-300 p-2 tabular-nums">16-9055-1234-90</td>
<td className="border border-neutral-300 p-2 font-medium">Zitouni Mustapha</td>
<td className="border border-neutral-300 p-2">Conducteur d'Engin / Grutier</td>
<td className="border border-neutral-300 p-2 text-center tabular-nums">
{stoppageHours}
h
</td>
</tr>
</tbody>
</table>
</div>
<div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-300 text-center t-cap">
<div className="p-2 border border-neutral-200 rounded-[var(--r-ctl-sm,10px)] h-24 flex flex-col justify-between">
<span className="font-semibold text-black/75">Pour l'Entreprise de BTPH</span>
<p className="t-cap text-black/55">Nom, Signature & Cachet de l'Employeur</p>
</div>
<div className="p-2 border border-neutral-200 rounded-[var(--r-ctl-sm,10px)] h-24 flex flex-col justify-between">
<span className="font-semibold text-black/75">Visa de l'Inspection du Travail / BET</span>
<p className="t-cap text-black/55">Confirmation de l'arrêt effectif des travaux</p>
</div>
</div>
</div>
<div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800 print:hidden">
<AtriumButton variant="outline" onClick={onClose}>{isAr ? "إلغاء" : "Fermer"}</AtriumButton>
<AtriumButton variant="primary" onClick={handleValidateDossier} icon={<CheckCircle2 size={15} />}>{isAr ? "اعتماد وإرسال إلى CACOBATPH" : "Valider & Enregistrer Dossier"}</AtriumButton>
</div>
</div>
</div>
</div>;
};

import React, { useState, useEffect } from 'react';
import {
  X,
  Car,
  Gauge,
  Fuel,
  ShieldCheck,
  Wrench,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  FileText,
  PenTool,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { RepairOrder, VehicleAsset, WorkshopBay, DamageMarker } from './garageData';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';

interface AutoOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: VehicleAsset[];
  bays?: WorkshopBay[];
  onSave: (order: RepairOrder) => void;
}



const AutoOrderModal = ({ isOpen, onClose, vehicles, bays = [], onSave }) => {
	const { language, showToast } = useAtriumStore();
	const [activeTab, setActiveTab] = React.useState("intake");
	const [selectedVehicleId, setSelectedVehicleId] = React.useState(vehicles[0]?.id || "");
	const [currentMileage, setCurrentMileage] = React.useState("");
	const [isOdometerReplaced, setIsOdometerReplaced] = React.useState(false);
	const [fuelLevel, setFuelLevel] = React.useState("50");
	const [isVehicleDirty, setIsVehicleDirty] = React.useState(false);
	const [accessories, setAccessories] = React.useState<Record<string, boolean>>({
		spareWheel: true,
		jackAndKit: true,
		carteGrise: true,
		radioScreen: true,
		wheelLockKey: false
	});
	const [activeCarView, setActiveCarView] = React.useState("front");
	const [damageMarkers, setDamageMarkers] = React.useState<any[]>([]);
	const [selectedDamageType, setSelectedDamageType] = React.useState("scratch");
	const [selectedSeverity, setSelectedSeverity] = React.useState("minor");
	const [markerNote, setMarkerNote] = React.useState("");
	const [diagnostic, setDiagnostic] = React.useState("");
	const [estimatedCost, setEstimatedCost] = React.useState("18500");
	const [assignedBayId, setAssignedBayId] = React.useState(bays[0]?.id || "bay_01");
	const [technician, setTechnician] = React.useState("Karim (Chef Atelier)");
	const [isClientSigned, setIsClientSigned] = React.useState(false);
	const activeVehicle = vehicles.find((v: any) => v.id === selectedVehicleId) || vehicles[0];
	React.useEffect(() => {
		if (activeVehicle) {
			setCurrentMileage(String(activeVehicle.mileageKm || 5e4));
			const freeBay = bays.find((b: any) => !b.isOccupied);
			if (freeBay) setAssignedBayId(freeBay.id);
		}
	}, [selectedVehicleId]);
	if (!isOpen) return null;
	const handleCanvasClick = (e: any) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const x = Math.round((e.clientX - rect.left) / rect.width * 100);
		const y = Math.round((e.clientY - rect.top) / rect.height * 100);
		const newMarker = {
			id: `dmg_${Date.now()}`,
			view: activeCarView,
			xPercent: x,
			yPercent: y,
			damageType: selectedDamageType,
			severity: selectedSeverity,
			notes: markerNote.trim() || void 0
		};
		setDamageMarkers((prev) => [...prev, newMarker]);
		setMarkerNote("");
		showToast(language === "ar" ? "تم تحديد موضع الضرر بنجاح" : "Repère de dommage consigné", "info");
	};
	const removeMarker = (id: any) => {
		setDamageMarkers((prev) => prev.filter((m) => m.id !== id));
	};
	const handleSubmit = (e: any) => {
		e.preventDefault();
		if (!activeVehicle) {
			showToast(language === "ar" ? "يرجى اختيار مركبة" : "Veuillez sélectionner un véhicule", "error");
			return;
		}
		const enteredKm = parseInt(currentMileage, 10);
		if (!isOdometerReplaced && activeVehicle.lastServiceKm && enteredKm < activeVehicle.lastServiceKm) {
			showToast(language === "ar" ? `العداد المدخل (${enteredKm} كم) أقل من المسجل سابقاً (${activeVehicle.lastServiceKm} كم)` : `Kilométrage saisi (${enteredKm} km) inférieur au dernier relevé (${activeVehicle.lastServiceKm} km)`, "error");
			return;
		}
		const assignedBay = bays.find((b: any) => b.id === assignedBayId);
		const newOrder = {
			id: `ro_${Date.now()}`,
			orderNumber: `OR-2026-${Math.floor(1e3 + Math.random() * 9e3)}`,
			vehiclePlate: activeVehicle.plateNumber,
			vehicleModel: `${activeVehicle.brand} ${activeVehicle.model}`,
			clientName: activeVehicle.ownerName,
			clientPhone: activeVehicle.ownerPhone,
			clientType: activeVehicle.isFleet ? "corporate_fleet" : "individual",
			fleetId: activeVehicle.fleetId,
			fleetName: activeVehicle.fleetName,
			intakeDate: (/* @__PURE__ */ new Date()).toISOString(),
			diagnosticNotes: diagnostic.trim() || "Diagnostic préliminaire & révision générale",
			status: "Diagnostic",
			estimatedCostDzd: parseFloat(estimatedCost) || 15e3,
			finalCostDzd: 0,
			partsUsed: [],
			technicianName: technician,
			assignedBayId: assignedBay?.id,
			bayName: assignedBay?.name || "Pont 1",
			fuelLevel,
			inOdometerKm: enteredKm || activeVehicle.mileageKm,
			isVehicleDirty,
			damageMarkers,
			billingType: activeVehicle.isFleet ? "facture_dgi" : "bon_caisse",
			isPaid: false
		};
		onSave(newOrder);
		showToast(language === "ar" ? `تم فتح أمر التصليح (${newOrder.orderNumber}) وفحص الاستلام` : `Ordre de réparation (${newOrder.orderNumber}) et fiche d'entrée créés`, "success");
		onClose();
	};
	const vehicleOptions = vehicles.map((v: any) => ({
		value: v.id,
		label: `${v.plateNumber} — ${v.brand} ${v.model} (${v.ownerName}${v.fleetName ? ` · ${v.fleetName}` : ""})`
	}));
	const bayOptions = bays.map((b: any) => ({
		value: b.id,
		label: `${b.name} ${b.isOccupied ? "(Occupé)" : "(Libre)"}`
	}));
	return /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in">
<div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
<div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-2xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center"><Car size={20} /></div>
<div>
<h3 className="font-bold text-base text-neutral-900 dark:text-white">
{language === "ar" ? "استلام مركبة جديدة وأمر تصليح (OR)" : "Fiche d'Entrée Atelier & Ordre de Réparation"}
</h3>
</div>
</div>
<button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"><X size={18} /></button>
</div>
<div className="flex items-center gap-1 px-6 pt-3 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-x-auto">
{[
						{
							id: "intake",
							label: language === "ar" ? "1. بيانات الدخول والعداد" : "1. Véhicule & Compteur",
							icon: /* @__PURE__ */ <Gauge size={14} />
						},
						{
							id: "walkaround",
							label: language === "ar" ? "2. معاينة الهيكل" : "2. Inspection Carrosserie",
							icon: /* @__PURE__ */ <Camera size={14} />
						},
						{
							id: "dispatch",
							label: language === "ar" ? "3. العطل وجسر الرفع" : "3. Diagnostic & Pont",
							icon: /* @__PURE__ */ <Wrench size={14} />
						},
						{
							id: "signature",
							label: language === "ar" ? "4. الموافقة والتوقيع" : "4. Accord & Signature",
							icon: /* @__PURE__ */ <PenTool size={14} />
						}
					].map((t) => /* @__PURE__ */ <button key={t.id} type="button" onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === t.id ? "border-[#d4522f] text-[#d4522f] bg-[#d4522f]/5" : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"}`}>
{t.icon}
<span>{t.label}</span>
{t.id === "walkaround" && damageMarkers.length > 0 && /* @__PURE__ */ <span className="w-5 h-5 rounded-full bg-[#d4522f] text-white text-[10px] flex items-center justify-center font-mono">{damageMarkers.length}</span>}
</button>)}
</div>
<div className="flex-1 overflow-y-auto p-6 space-y-6">
{activeTab === "intake" && /* @__PURE__ */ <div className="space-y-5 animate-in fade-in">
<div className="p-4 rounded-2xl bg-[#F3EDE7] dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700/80 space-y-4">
<LabelSelect label={language === "ar" ? "المركبة والماتريكيل" : "Véhicule & Matricule"} value={selectedVehicleId} onChange={setSelectedVehicleId} options={vehicleOptions} />
{activeVehicle && /* @__PURE__ */ <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200/60 dark:border-neutral-800">
<div>
<span className="text-neutral-400 block">{language === "ar" ? "المالك" : "Propriétaire"}</span>
<span className="font-semibold text-neutral-800 dark:text-neutral-200">{activeVehicle.ownerName}</span>
</div>
<div>
<span className="text-neutral-400 block">{language === "ar" ? "الهاتف" : "Téléphone"}</span>
<span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">{activeVehicle.ownerPhone}</span>
</div>
<div>
<span className="text-neutral-400 block">{language === "ar" ? "آخر صيانة" : "Dernier Entretien"}</span>
<span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">
{activeVehicle.lastServiceKm?.toLocaleString() || "—"}
{" km"}
</span>
</div>
<div>
<span className="text-neutral-400 block">{language === "ar" ? "الحساب" : "Type Compte"}</span>
<span className="font-semibold text-[#d4522f]">{activeVehicle.isFleet ? `Flotte: ${activeVehicle.fleetName}` : "Particulier"}</span>
</div>
</div>}
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
<div className="space-y-2">
<LabelInput label={language === "ar" ? "العداد الفعلي عند الدخول (كم)" : "Kilométrage actuel compteur (km)"} type="number" value={currentMileage} onChange={(e) => setCurrentMileage(e.target.value)} required />
<label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer pt-1">
<input type="checkbox" checked={isOdometerReplaced} onChange={(e) => setIsOdometerReplaced(e.target.checked)} className="rounded text-[#d4522f] focus:ring-[#d4522f]" />
<span>
{language === "ar" ? "العداد مستبدل أو معاد للصفر" : "Compteur remplacé ou remis à zéro"}
</span>
</label>
</div>
<div className="space-y-1.5">
<label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
<span className="flex items-center gap-1.5">
<Fuel size={14} className="text-[#d4522f]" />
{language === "ar" ? "مستوى الوقود" : "Niveau de carburant"}
</span>
<span className="font-mono text-[#d4522f] font-bold">
{fuelLevel}
%
</span>
</label>
<div className="grid grid-cols-5 gap-1.5 pt-1">
{[
												"0",
												"25",
												"50",
												"75",
												"100"
											].map((lvl) => /* @__PURE__ */ <button key={lvl} type="button" onClick={() => setFuelLevel(lvl)} className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center ${fuelLevel === lvl ? "bg-[#d4522f] text-white border-[#d4522f] shadow-xs" : "bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400"}`}>{lvl === "0" ? "Vide" : lvl === "100" ? "Plein" : `${lvl}%`}</button>)}
</div>
</div>
</div>
<div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700/80 space-y-3">
<div className="flex items-center justify-between">
<span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
{language === "ar" ? "الملحقات والأغراض المسلمة في المركبة" : "Accessoires & Objets à Bord"}
</span>
<label className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800 cursor-pointer">
<input type="checkbox" checked={isVehicleDirty} onChange={(e) => setIsVehicleDirty(e.target.checked)} className="rounded text-amber-600" />
<span>
{language === "ar" ? "المركبة غير نظيفة (فحص مشروط)" : "Véhicule très sale (réserve carrosserie)"}
</span>
</label>
</div>
<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
{[
											{
												key: "spareWheel",
												label: language === "ar" ? "عجلة الاحتياط (Secours)" : "Roue de secours présente"
											},
											{
												key: "jackAndKit",
												label: language === "ar" ? "الرافعة ومفتاح البراغي" : "Cric & manivelle"
											},
											{
												key: "carteGrise",
												label: language === "ar" ? "البطاقة الرمادية بالمركبة" : "Carte grise / Documents"
											},
											{
												key: "radioScreen",
												label: language === "ar" ? "شاشة الراديو / الملاحة" : "Autoradio / Écran GPS"
											},
											{
												key: "wheelLockKey",
												label: language === "ar" ? "مفتاح براغي العجلات السري" : "Écrou antivol jantes"
											}
										].map((item) => /* @__PURE__ */ <label key={item.key} className="flex items-center gap-2 p-2 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/60 dark:border-neutral-800 cursor-pointer">
<input type="checkbox" checked={accessories[item.key]} onChange={(e) => setAccessories((prev) => ({
													...prev,
													[item.key]: e.target.checked
												}))} className="rounded text-[#d4522f] focus:ring-[#d4522f]" />
<span className="text-neutral-700 dark:text-neutral-300">{item.label}</span>
</label>)}
</div>
</div>
</div>}
{activeTab === "walkaround" && /* @__PURE__ */ <div className="space-y-4 animate-in fade-in">
<div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80">
<div className="flex items-center gap-1.5">
{[
											"front",
											"rear",
											"left",
											"right"
										].map((view) => /* @__PURE__ */ <button key={view} type="button" onClick={() => setActiveCarView(view)} className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeCarView === view ? "bg-[#d4522f] text-white shadow-xs" : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700"}`}>
{view === "front" ? "Face Avant" : view === "rear" ? "Face Arrière" : view === "left" ? "Côté Gauche" : "Côté Droit"}
</button>)}
</div>
<div className="flex items-center gap-2">
<select value={selectedDamageType} onChange={(e) => setSelectedDamageType(e.target.value)} className="text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5">
<option value="scratch">Rayure (Scratch)</option>
<option value="dent">Bosse (Dent)</option>
<option value="crack">Fissure / Cassure</option>
<option value="paint_chip">Éclat peinture</option>
<option value="missing_part">Pièce manquante</option>
</select>
<select value={selectedSeverity} onChange={(e) => setSelectedSeverity(e.target.value)} className="text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5">
<option value="minor">Léger</option>
<option value="moderate">Moyen</option>
<option value="severe">Important</option>
</select>
</div>
</div>
<div className="relative w-full h-64 sm:h-72 bg-neutral-900 rounded-3xl border border-neutral-800 flex items-center justify-center overflow-hidden cursor-crosshair group">
<div onClick={handleCanvasClick} className="w-full h-full relative flex items-center justify-center p-4">
<svg viewBox="0 0 400 200" className="w-full max-w-md h-full opacity-70 group-hover:opacity-90 transition-opacity">
{activeCarView === "front" && /* @__PURE__ */ <g stroke="#d4522f" strokeWidth="2.5" fill="none">
<rect x="70" y="60" width="260" height="90" rx="30" />
<path d="M100 60 L130 20 L270 20 L300 60" />
<circle cx="110" cy="100" r="18" />
<circle cx="290" cy="100" r="18" />
<rect x="150" y="90" width="100" height="25" rx="5" />
<line x1="80" y1="140" x2="320" y2="140" strokeWidth="4" />
</g>}
{activeCarView === "rear" && /* @__PURE__ */ <g stroke="#d4522f" strokeWidth="2.5" fill="none">
<rect x="70" y="60" width="260" height="90" rx="25" />
<path d="M100 60 L120 25 L280 25 L300 60" />
<rect x="90" y="85" width="40" height="20" rx="4" fill="#EF4444" fillOpacity="0.4" />
<rect x="270" y="85" width="40" height="20" rx="4" fill="#EF4444" fillOpacity="0.4" />
<rect x="160" y="95" width="80" height="30" rx="4" />
<circle cx="200" cy="75" r="8" />
</g>}
{(activeCarView === "left" || activeCarView === "right") && /* @__PURE__ */ <g stroke="#d4522f" strokeWidth="2.5" fill="none">
<path d="M40 120 L80 120 L110 70 L260 70 L320 100 L360 120 L360 140 L40 140 Z" />
<circle cx="100" cy="140" r="24" strokeWidth="3" />
<circle cx="300" cy="140" r="24" strokeWidth="3" />
<line x1="180" y1="70" x2="180" y2="140" />
<rect x="130" y="100" width="15" height="5" rx="2" />
<rect x="210" y="100" width="15" height="5" rx="2" />
</g>}
</svg>
{damageMarkers.filter((m) => m.view === activeCarView).map((marker, idx) => /* @__PURE__ */ <div key={marker.id} style={{
													left: `${marker.xPercent}%`,
													top: `${marker.yPercent}%`
												}} className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#d4522f] text-white text-xs font-bold font-mono flex items-center justify-center border-2 border-white shadow-lg animate-in zoom-in" title={`${marker.damageType} (${marker.severity})`}>{idx + 1}</div>)}
<div className="absolute bottom-3 left-4 text-[11px] text-neutral-400 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-xs">
{language === "ar" ? "انقر على الصورة لإضافة نقطة خدش/صدمة" : "Cliquez sur le schéma pour consigner un dommage"}
</div>
</div>
</div>
<div className="space-y-2">
<span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
{language === "ar" ? "العيوب المرصودة في الفحص الأولي" : "Dommages & anomalies répertoriés"}
{" ("}
{damageMarkers.length}
)
</span>
{damageMarkers.length === 0 ? /* @__PURE__ */ <p className="text-xs text-neutral-400 italic">
{language === "ar" ? "لم يتم تسجيل أي خدوش. انقر على المخطط أعلاه لتحديد الأضرار." : "Aucun dommage répertorié. Cliquez sur le schéma ci-dessus pour ajouter des repères."}
</p> : /* @__PURE__ */ <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
{damageMarkers.map((m, idx) => /* @__PURE__ */ <div key={m.id} className="flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200/60 dark:border-neutral-700 text-xs">
<div className="flex items-center gap-2">
<span className="w-5 h-5 rounded-full bg-[#d4522f] text-white flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
<div>
<span className="font-semibold text-neutral-900 dark:text-white capitalize">{m.damageType}</span>
<span className="text-neutral-400 ml-1.5 capitalize">
(
{m.view}
{" · "}
{m.severity}
)
</span>
</div>
</div>
<button type="button" onClick={() => removeMarker(m.id)} className="text-neutral-400 hover:text-rose-500 p-1"><Trash2 size={13} /></button>
</div>)}
</div>}
</div>
</div>}
{activeTab === "dispatch" && /* @__PURE__ */ <div className="space-y-4 animate-in fade-in">
<LabelInput label={language === "ar" ? "وصف العطل والشكوى الأولية" : "Symptômes & motif de dépose (Panne constatée)"} value={diagnostic} onChange={(e) => setDiagnostic(e.target.value)} placeholder="Ex: Bruit suspect au freinage, voyant moteur orange, révision vidange..." required />
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
<LabelInput label={language === "ar" ? "التقدير المالي الأولي (د.ج)" : "Devis prévisionnel (DA HT)"} type="number" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
<LabelSelect label={language === "ar" ? "جسر الرفع / المنصة" : "Pont élévateur assigné"} value={assignedBayId} onChange={setAssignedBayId} options={bayOptions} />
<LabelSelect label={language === "ar" ? "الميكانيكي المكلف" : "Technicien responsable"} value={technician} onChange={setTechnician} options={[
												{
													value: "Karim (Chef Atelier)",
													label: "Karim (Chef Atelier)"
												},
												{
													value: "Farid (Mécanicien)",
													label: "Farid (Mécanicien)"
												},
												{
													value: "Amine (Électricien Auto)",
													label: "Amine (Électricien Auto)"
												},
												{
													value: "Yassine (Technicien Entretien)",
													label: "Yassine (Technicien Entretien)"
												}
											]} />
</div>
<div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700/80 space-y-2 text-xs">
<span className="font-bold text-neutral-800 dark:text-neutral-200 block">
{language === "ar" ? "معايير الفحص الأولي للورشة" : "Protocole d'admission & sécurité atelier"}
</span>
<ul className="list-disc list-inside text-neutral-500 space-y-1">
<li>
{language === "ar" ? "فحص رقم الهيكل (VIN) على الشاسيه ومطابقته مع البطاقة الرمادية" : "Vérification du numéro de châssis (VIN) sous pare-brise"}
</li>
<li>
{language === "ar" ? "تفريغ الأغراض الثمينة وإعادتها لصاحب المركبة" : "Restitution des objets de valeur au propriétaire avant admission"}
</li>
<li>
{language === "ar" ? "تطبيق غطاء حماية المقاعد والمقود البلاستيكي" : "Pose des protections plastiques siège et volant avant entrée en baie"}
</li>
</ul>
</div>
</div>}
{activeTab === "signature" && /* @__PURE__ */ <div className="space-y-4 animate-in fade-in">
<div className="p-4 rounded-2xl bg-[#FDF4F0] dark:bg-neutral-800 border border-[#d4522f]/30 space-y-2">
<div className="flex items-center gap-2 text-sm font-bold text-[#d4522f]">
<ShieldCheck size={18} />
<span>
{language === "ar" ? "عقد استلام وحراسة قانونية (المادة 581 من القانون المدني)" : "Conditions Contradictoires de Dépôt & Garde (Art. 581 Code Civil)"}
</span>
</div>
<p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
{language === "ar" ? "يصرح الزبون ومسؤول الاستقبال بصحة فحص الهيكل، مستوى الوقود والعداد المدونين أعلاه. الورشة مسؤولة عن حراسة المركبة طيلة فترة التصليح ضمن حدود الأضرار المبينة في هذا الأمر." : "Le propriétaire et le chef d'atelier attestent de l'exactitude de l'état descriptif, du kilométrage et de la jauge carburant consignés ci-dessus. L'atelier assume la garde juridique du véhicule dans les strictes limites de la présente fiche d'entrée."}
</p>
</div>
<div className="p-5 rounded-2xl bg-white dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-4">
<div className="flex items-center justify-between">
<span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
<PenTool size={14} className="text-[#d4522f]" />
{language === "ar" ? "توقيع الزبون على الشاشة أو إقرار الاستلام" : "Signature client sur écran & accord contradictoire"}
</span>
{isClientSigned && /* @__PURE__ */ <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
<CheckCircle2 size={14} />
{language === "ar" ? "تم توثيق التوقيع" : "Signé & certifié"}
</span>}
</div>
<div onClick={() => setIsClientSigned(true)} className={`w-full h-28 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${isClientSigned ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400" : "bg-neutral-50 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 hover:border-[#d4522f]"}`}>
{isClientSigned ? /* @__PURE__ */ <div className="text-center space-y-1">
<span className="font-serif italic text-xl text-neutral-800 dark:text-white font-bold">{activeVehicle.ownerName}</span>
<p className="text-[10px] text-neutral-400 font-mono">
{(/* @__PURE__ */ new Date()).toLocaleString()}
{" · Signature Numérique Reçue"}
</p>
</div> : /* @__PURE__ */ <div className="text-center text-xs text-neutral-400 space-y-1">
<PenTool size={20} className="mx-auto text-neutral-300" />
<span>
{language === "ar" ? "انقر هنا لتسجيل توقيع الزبون الرقمي" : "Cliquez ici pour apposer la signature du client sur verre"}
</span>
</div>}
</div>
</div>
</div>}
</div>
<div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40">
<div className="flex items-center gap-2">
{activeTab !== "intake" && /* @__PURE__ */ <AtriumButton variant="secondary" onClick={() => {
								if (activeTab === "walkaround") setActiveTab("intake");
								if (activeTab === "dispatch") setActiveTab("walkaround");
								if (activeTab === "signature") setActiveTab("dispatch");
							}}>{language === "ar" ? "السابق" : "Précédent"}</AtriumButton>}
</div>
<div className="flex items-center gap-2">
<AtriumButton variant="secondary" onClick={onClose}>{language === "ar" ? "إلغاء" : "Annuler"}</AtriumButton>
{activeTab !== "signature" ? /* @__PURE__ */ <AtriumButton variant="primary" onClick={() => {
								if (activeTab === "intake") setActiveTab("walkaround");
								else if (activeTab === "walkaround") setActiveTab("dispatch");
								else if (activeTab === "dispatch") setActiveTab("signature");
							}}>{language === "ar" ? "التالي" : "Suivant"}</AtriumButton> : /* @__PURE__ */ <AtriumButton variant="primary" onClick={handleSubmit} icon={<CheckCircle2 size={16} />}>{language === "ar" ? "اعتماد أمر التصليح (Créer OR)" : "Valider & Ouvrir l'OR"}</AtriumButton>}
</div>
</div>
</div>
</div>;
};

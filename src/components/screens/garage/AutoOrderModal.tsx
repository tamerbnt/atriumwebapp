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
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
} from '../../../services/store';
import { RepairOrder, VehicleAsset, WorkshopBay, DamageMarker } from './garageData';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';

interface AutoOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: VehicleAsset[];
  bays?: WorkshopBay[];
  onSave: (order: RepairOrder) => void;
}

const extractStr = (eOrVal: any): string =>
  eOrVal?.target?.value !== undefined ? String(eOrVal.target.value) : String(eOrVal ?? '');

export const AutoOrderModal: React.FC<AutoOrderModalProps> = ({ isOpen, onClose, vehicles, bays = [], onSave }) => {
	const { language, currentBusiness, currentBranch, currentUser } = useAtriumSelector(
	  (s) => ({
	    language: s.language,
	    currentBusiness: selectCurrentBusinessFromState(s),
	    currentBranch: selectCurrentBranchFromState(s),
	    currentUser: s.currentUser,
	  }),
	  shallowEqualObjects
	);
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
	const [damageMarkers, setDamageMarkers] = React.useState<DamageMarker[]>([]);
	const [selectedDamageType, setSelectedDamageType] = React.useState("scratch");
	const [selectedSeverity, setSelectedSeverity] = React.useState("minor");
	const [markerNote, setMarkerNote] = React.useState("");
	const [diagnostic, setDiagnostic] = React.useState("");
	const [estimatedCost, setEstimatedCost] = React.useState("18500");
	const [assignedBayId, setAssignedBayId] = React.useState(bays[0]?.id || "bay_01");
	const [technician, setTechnician] = React.useState("Karim (Chef Atelier)");
	const [isClientSigned, setIsClientSigned] = React.useState(false);
	const activeVehicle = vehicles.find((v: VehicleAsset) => v.id === selectedVehicleId) || vehicles[0];
	React.useEffect(() => {
		if (!isOpen) return;
		setActiveTab("intake");
		setSelectedVehicleId(vehicles[0]?.id || "");
		setIsOdometerReplaced(false);
		setFuelLevel("50");
		setIsVehicleDirty(false);
		setDamageMarkers([]);
		setMarkerNote("");
		setDiagnostic("");
		setEstimatedCost("18500");
		setTechnician("Karim (Chef Atelier)");
		setIsClientSigned(false);
	}, [isOpen, vehicles]);
	React.useEffect(() => {
		if (activeVehicle) {
			setCurrentMileage(String(activeVehicle.mileageKm || 5e4));
			const freeBay = bays.find((b: WorkshopBay) => !b.isOccupied);
			if (freeBay) setAssignedBayId(freeBay.id);
		}
	}, [selectedVehicleId, activeVehicle, bays]);
	const handleCanvasClick = (e: React.MouseEvent<HTMLButtonElement>) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const x = Math.round((e.clientX - rect.left) / rect.width * 100);
		const y = Math.round((e.clientY - rect.top) / rect.height * 100);
		const newMarker: DamageMarker = {
			id: `dmg_${Date.now()}`,
			view: activeCarView as DamageMarker['view'],
			xPercent: x,
			yPercent: y,
			damageType: selectedDamageType as DamageMarker['damageType'],
			severity: selectedSeverity as DamageMarker['severity'],
			notes: markerNote.trim() || undefined
		};
		setDamageMarkers((prev) => [...prev, newMarker]);
		setMarkerNote("");
		showToast({
			type: "info",
			title: language === "ar" ? "فحص الهيكل" : "Inspection",
			message: language === "ar" ? "تم تحديد موضع الضرر بنجاح" : "Repère de dommage consigné",
		});
	};
	const removeMarker = (id: string) => {
		setDamageMarkers((prev) => prev.filter((m) => m.id !== id));
	};
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!activeVehicle) {
			showToast({
				type: "error",
				title: language === "ar" ? "خطأ" : "Véhicule manquant",
				message: language === "ar" ? "يرجى اختيار مركبة" : "Veuillez sélectionner un véhicule",
			});
			return;
		}
		const enteredKm = parseInt(currentMileage, 10);
		if (!isOdometerReplaced && activeVehicle.lastServiceKm && enteredKm < activeVehicle.lastServiceKm) {
			showToast({
				type: "error",
				title: language === "ar" ? "خطأ في العداد" : "Kilométrage incohérent",
				message: language === "ar" ? `العداد المدخل (${enteredKm} كم) أقل من المسجل سابقاً (${activeVehicle.lastServiceKm} كم)` : `Kilométrage saisi (${enteredKm} km) inférieur au dernier relevé (${activeVehicle.lastServiceKm} km)`,
			});
			return;
		}
		const assignedBay = bays.find((b: WorkshopBay) => b.id === assignedBayId);
		const newOrder: RepairOrder = {
			id: `ro_${Date.now()}`,
			accountId: activeVehicle.accountId || 'acc_01',
			businessId: currentBusiness?.id || activeVehicle.businessId || 'biz_garage',
			branchId: currentBranch?.id || activeVehicle.branchId || 'branch_garage_main',
			staffId: currentUser?.id || 'stf_01',
			orderNumber: `OR-2026-${Math.floor(1e3 + Math.random() * 9e3)}`,
			vehiclePlate: activeVehicle.plateNumber,
			vehicleModel: `${activeVehicle.brand} ${activeVehicle.model}`,
			clientName: activeVehicle.ownerName,
			clientPhone: activeVehicle.ownerPhone,
			clientType: activeVehicle.isFleet ? "corporate_fleet" : "individual",
			fleetId: activeVehicle.fleetId,
			fleetName: activeVehicle.fleetName,
			intakeDate: new Date().toISOString(),
			diagnosticNotes: diagnostic.trim() || "Diagnostic préliminaire & révision générale",
			status: "Diagnostic",
			estimatedCostDzd: parseFloat(estimatedCost) || 15e3,
			finalCostDzd: 0,
			partsUsed: [],
			technicianName: technician,
			assignedBayId: assignedBay?.id,
			bayName: assignedBay?.name || "Pont 1",
			fuelLevel: fuelLevel as RepairOrder['fuelLevel'],
			inOdometerKm: enteredKm || activeVehicle.mileageKm,
			isVehicleDirty,
			damageMarkers,
			billingType: activeVehicle.isFleet ? "facture_dgi" : "bon_caisse",
			isPaid: false
		};
		onSave(newOrder);
		onClose();
	};
	const vehicleOptions = vehicles.map((v: VehicleAsset) => ({
		value: v.id,
		label: `${v.plateNumber} — ${v.brand} ${v.model} (${v.ownerName}${v.fleetName ? ` · ${v.fleetName}` : ""})`
	}));
	const bayOptions = bays.map((b: WorkshopBay) => ({
		value: b.id,
		label: `${b.name} ${b.isOccupied ? "(Occupé)" : "(Libre)"}`
	}));
	return (
<KineticModalShell isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-4xl" zIndexClass="z-[9990]" scrimClassName="bg-black/60">
<div data-sq="panel" data-sq-border="solid" className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full max-h-[92vh] flex flex-col overflow-hidden">
<div className="flex items-center justify-between px-6 py-4 border-b border-[var(--atr-divider)] bg-[#F5F1EC]/60 dark:bg-[#22201E]">
<div className="flex items-center gap-3">
<div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center"><Car size={20} /></div>
<div>
<h3 className="font-semibold t-card text-black dark:text-white">
{language === "ar" ? "استلام مركبة جديدة وأمر تصليح (OR)" : "Fiche d'Entrée Atelier & Ordre de Réparation"}
</h3>
</div>
</div>
<button type="button" onClick={onClose} aria-label={language === "ar" ? "إغلاق" : "Fermer"} className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"><X size={18} /></button>
</div>
<div className="flex items-center gap-1 px-6 pt-3 border-b border-[var(--atr-divider)] bg-white dark:bg-[#262422] overflow-x-auto">
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
					].map((t) => /* @__PURE__ */ <button key={t.id} type="button" onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 px-4 py-2 t-small font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === t.id ? "border-[#d4522f] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] bg-[#d4522f]/5" : "border-transparent text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white"}`}>
{t.icon}
<span>{t.label}</span>
{t.id === "walkaround" && damageMarkers.length > 0 && /* @__PURE__ */ <span className="w-5 h-5 rounded-full bg-[var(--brand-fill,#C9461F)] text-white t-cap flex items-center justify-center tabular-nums">{damageMarkers.length}</span>}
</button>)}
</div>
<div className="flex-1 overflow-y-auto p-6 space-y-6">
{activeTab === "intake" && /* @__PURE__ */ <div className="space-y-5 animate-in fade-in">
<div data-sq="card" data-sq-border="none" className="p-4 bg-[#F3EDE7] dark:bg-[#22201E] space-y-4">
<LabelSelect label={language === "ar" ? "المركبة والماتريكيل" : "Véhicule & Matricule"} value={selectedVehicleId} onChange={(v) => setSelectedVehicleId(extractStr(v))} options={vehicleOptions} />
{activeVehicle && /* @__PURE__ */ <div data-sq="ctl" data-sq-border="none" className="grid grid-cols-2 sm:grid-cols-4 gap-3 t-cap bg-white dark:bg-[#191716] p-3">
<div>
<span className="text-black/55 dark:text-white/55 block">{language === "ar" ? "المالك" : "Propriétaire"}</span>
<span className="font-semibold text-black dark:text-white">{activeVehicle.ownerName}</span>
</div>
<div>
<span className="text-black/55 dark:text-white/55 block">{language === "ar" ? "الهاتف" : "Téléphone"}</span>
<span className="font-semibold text-black dark:text-white tabular-nums">{activeVehicle.ownerPhone}</span>
</div>
<div>
<span className="text-black/55 dark:text-white/55 block">{language === "ar" ? "آخر صيانة" : "Dernier Entretien"}</span>
<span className="font-semibold text-black dark:text-white tabular-nums">
{activeVehicle.lastServiceKm?.toLocaleString() || "—"}
{" km"}
</span>
</div>
<div>
<span className="text-black/55 dark:text-white/55 block">{language === "ar" ? "الحساب" : "Type Compte"}</span>
<span className="font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{activeVehicle.isFleet ? `Flotte: ${activeVehicle.fleetName}` : "Particulier"}</span>
</div>
</div>}
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
<div className="space-y-2">
<LabelInput label={language === "ar" ? "العداد الفعلي عند الدخول (كم)" : "Kilométrage actuel compteur (km)"} type="number" value={currentMileage} onChange={(e) => setCurrentMileage(e.target.value)} required />
<label className="flex items-center gap-2 t-cap text-black/70 dark:text-white/75 cursor-pointer pt-1">
<input type="checkbox" checked={isOdometerReplaced} onChange={(e) => setIsOdometerReplaced(e.target.checked)} className="rounded-[var(--r-check,6px)] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] focus:ring-[#d4522f]" />
<span>
{language === "ar" ? "العداد مستبدل أو معاد للصفر" : "Compteur remplacé ou remis à zéro"}
</span>
</label>
</div>
<div className="space-y-2">
<label className="t-small font-semibold text-black/70 dark:text-white/75 flex items-center justify-between">
<span className="flex items-center gap-2">
<Fuel size={14} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
{language === "ar" ? "مستوى الوقود" : "Niveau de carburant"}
</span>
<span className="tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold">
{fuelLevel}
%
</span>
</label>
<div className="grid grid-cols-5 gap-2 pt-1">
{[
												"0",
												"25",
												"50",
												"75",
												"100"
											].map((lvl) => /* @__PURE__ */ <button key={lvl} type="button" data-no-liquid="true" data-sq="ctl" data-sq-border="none" onClick={() => setFuelLevel(lvl)} className={`py-2 t-small font-semibold transition-all cursor-pointer text-center ${fuelLevel === lvl ? "bg-[#d4522f] text-white" : "bg-[#F5F1EC] dark:bg-[#2B2825] text-black/70 dark:text-white/75 hover:bg-[#EAE1D8] dark:hover:bg-[#332F2B]"}`}>{lvl === "0" ? "Vide" : lvl === "100" ? "Plein" : `${lvl}%`}</button>)}
</div>
</div>
</div>
<div data-sq="card" data-sq-border="none" className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] space-y-3">
<div className="flex items-center justify-between">
<span className="t-small font-semibold text-black dark:text-white">
{language === "ar" ? "الملحقات والأغراض المسلمة في المركبة" : "Accessoires & Objets à Bord"}
</span>
<label className="flex items-center gap-2 t-cap text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full cursor-pointer">
<input type="checkbox" checked={isVehicleDirty} onChange={(e) => setIsVehicleDirty(e.target.checked)} className="rounded-[var(--r-check,6px)] text-amber-600" />
<span>
{language === "ar" ? "المركبة غير نظيفة (فحص مشروط)" : "Véhicule très sale (réserve carrosserie)"}
</span>
</label>
</div>
<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 t-cap">
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
										].map((item) => /* @__PURE__ */ <label key={item.key} data-sq="ctl" data-sq-border="none" className="flex items-center gap-2 p-2 bg-white dark:bg-[#2B2825] cursor-pointer">
<input type="checkbox" checked={accessories[item.key]} onChange={(e) => setAccessories((prev) => ({
													...prev,
													[item.key]: e.target.checked
												}))} className="rounded-[var(--r-check,6px)] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] focus:ring-[#d4522f]" />
<span className="text-black/70 dark:text-white/75">{item.label}</span>
</label>)}
</div>
</div>
</div>}
{activeTab === "walkaround" && /* @__PURE__ */ <div className="space-y-4 animate-in fade-in">
<div data-sq="card" data-sq-border="none" className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#F5F1EC] dark:bg-[#22201E]">
<div className="flex items-center gap-2">
{[
											"front",
											"rear",
											"left",
											"right"
										].map((view) => /* @__PURE__ */ <button key={view} type="button" data-no-liquid="true" data-sq="ctl" data-sq-border="none" onClick={() => setActiveCarView(view)} className={`px-3 py-2 t-small font-semibold transition-all cursor-pointer ${activeCarView === view ? "bg-[#d4522f] text-white" : "bg-white dark:bg-[#2B2825] text-black/70 dark:text-white/75 hover:bg-[#EFE9E2] dark:hover:bg-[#332F2B]"}`}>
{view === "front" ? "Face Avant" : view === "rear" ? "Face Arrière" : view === "left" ? "Côté Gauche" : "Côté Droit"}
</button>)}
</div>
<div className="flex items-center gap-2">
<div data-sq="ctl" data-sq-border="none" className="bg-white dark:bg-[#2B2825] focus-within:ring-2 focus-within:ring-[#d4522f]/30 transition-shadow">
<select value={selectedDamageType} onChange={(e) => setSelectedDamageType(e.target.value)} className="lbi-field w-full h-full bg-transparent border-0 t-cap px-2.5 py-2 focus:outline-none">
<option value="scratch">Rayure (Scratch)</option>
<option value="dent">Bosse (Dent)</option>
<option value="crack">Fissure / Cassure</option>
<option value="paint_chip">Éclat peinture</option>
<option value="missing_part">Pièce manquante</option>
</select>
</div>
<div data-sq="ctl" data-sq-border="none" className="bg-white dark:bg-[#2B2825] focus-within:ring-2 focus-within:ring-[#d4522f]/30 transition-shadow">
<select value={selectedSeverity} onChange={(e) => setSelectedSeverity(e.target.value)} className="lbi-field w-full h-full bg-transparent border-0 t-cap px-2.5 py-2 focus:outline-none">
<option value="minor">Léger</option>
<option value="moderate">Moyen</option>
<option value="severe">Important</option>
</select>
</div>
</div>
</div>
<div data-sq="card" data-sq-border="solid" data-surface="dark" className="relative w-full h-64 sm:h-72 bg-[#191716] dark:bg-[#131211] [--sq-stroke:var(--sq-stroke-obsidian)] flex items-center justify-center overflow-hidden group">
<button type="button" onClick={handleCanvasClick} aria-label={language === "ar" ? "انقر على المخطط لتسجيل الضرر" : "Cliquer sur le schéma pour consigner un dommage"} className="w-full h-full relative flex items-center justify-center p-4 cursor-crosshair bg-transparent border-0">
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
{damageMarkers.filter((m) => m.view === activeCarView).map((marker, idx) => /* @__PURE__ */ <span key={marker.id} style={{
													left: `${marker.xPercent}%`,
													top: `${marker.yPercent}%`
												}} className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[var(--brand-fill,#C9461F)] text-white t-small font-semibold tabular-nums flex items-center justify-center border-2 border-white shadow-lg animate-in zoom-in pointer-events-none" title={`${marker.damageType} (${marker.severity})`}>{idx + 1}</span>)}
<span className="absolute bottom-3 left-4 t-cap text-white/75 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-xs pointer-events-none">
{language === "ar" ? "انقر على الصورة لإضافة نقطة خدش/صدمة" : "Cliquez sur le schéma pour consigner un dommage"}
</span>
</button>
</div>
<div className="space-y-2">
<span className="t-small font-semibold text-black/70 dark:text-white/75">
{language === "ar" ? "العيوب المرصودة في الفحص الأولي" : "Dommages & anomalies répertoriés"}
{" ("}
{damageMarkers.length}
)
</span>
{damageMarkers.length === 0 ? /* @__PURE__ */ <p className="t-cap text-black/55 dark:text-white/55 italic">
{language === "ar" ? "لم يتم تسجيل أي خدوش. انقر على المخطط أعلاه لتحديد الأضرار." : "Aucun dommage répertorié. Cliquez sur le schéma ci-dessus pour ajouter des repères."}
</p> : /* @__PURE__ */ <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
{damageMarkers.map((m, idx) => /* @__PURE__ */ <div key={m.id} data-sq="ctl" data-sq-border="none" className="flex items-center justify-between p-3 bg-[#F5F1EC] dark:bg-[#2B2825] t-cap">
<div className="flex items-center gap-2">
<span className="w-5 h-5 rounded-full bg-[var(--brand-fill,#C9461F)] text-white flex items-center justify-center t-small font-semibold">{idx + 1}</span>
<div>
<span className="font-semibold text-black dark:text-white capitalize">{m.damageType}</span>
<span className="text-black/55 dark:text-white/55 ml-1.5 capitalize">
(
{m.view}
{" · "}
{m.severity}
)
</span>
</div>
</div>
<button type="button" onClick={() => removeMarker(m.id)} className="rounded-full text-black/55 dark:text-white/55 hover:text-rose-500 p-1"><Trash2 size={13} /></button>
</div>)}
</div>}
</div>
</div>}
{activeTab === "dispatch" && /* @__PURE__ */ <div className="space-y-4 animate-in fade-in">
<LabelInput label={language === "ar" ? "وصف العطل والشكوى الأولية" : "Symptômes & motif de dépose (Panne constatée)"} value={diagnostic} onChange={(e) => setDiagnostic(e.target.value)} placeholder="Ex: Bruit suspect au freinage, voyant moteur orange, révision vidange..." required />
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
<LabelInput label={language === "ar" ? "التقدير المالي الأولي (د.ج)" : "Devis prévisionnel (DA HT)"} type="number" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
<LabelSelect label={language === "ar" ? "جسر الرفع / المنصة" : "Pont élévateur assigné"} value={assignedBayId} onChange={(v) => setAssignedBayId(extractStr(v))} options={bayOptions} />
<LabelSelect label={language === "ar" ? "الميكانيكي المكلف" : "Technicien responsable"} value={technician} onChange={(v) => setTechnician(extractStr(v))} options={[
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
<div data-sq="card" data-sq-border="none" className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] space-y-2 t-cap">
<span className="font-semibold text-black dark:text-white block">
{language === "ar" ? "معايير الفحص الأولي للورشة" : "Protocole d'admission & sécurité atelier"}
</span>
<ul className="list-disc list-inside text-black/55 dark:text-white/55 space-y-1">
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
<div data-sq="card" data-sq-border="none" className="p-4 bg-[#FDF4F0] dark:bg-[#2B2825] space-y-2">
<div className="flex items-center gap-2 t-label font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
<ShieldCheck size={18} />
<span>
{language === "ar" ? "عقد استلام وحراسة قانونية (المادة 581 من القانون المدني)" : "Conditions Contradictoires de Dépôt & Garde (Art. 581 Code Civil)"}
</span>
</div>
<p className="t-cap text-black/70 dark:text-white/75 leading-relaxed">
{language === "ar" ? "يصرح الزبون ومسؤول الاستقبال بصحة فحص الهيكل، مستوى الوقود والعداد المدونين أعلاه. الورشة مسؤولة عن حراسة المركبة طيلة فترة التصليح ضمن حدود الأضرار المبينة في هذا الأمر." : "Le propriétaire et le chef d'atelier attestent de l'exactitude de l'état descriptif, du kilométrage et de la jauge carburant consignés ci-dessus. L'atelier assume la garde juridique du véhicule dans les strictes limites de la présente fiche d'entrée."}
</p>
</div>
<div data-sq="card" data-sq-border="none" className="p-5 bg-[#F5F1EC] dark:bg-[#22201E] space-y-4">
<div className="flex items-center justify-between">
<span className="t-small font-semibold text-black dark:text-white flex items-center gap-2">
<PenTool size={14} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
{language === "ar" ? "توقيع الزبون على الشاشة أو إقرار الاستلام" : "Signature client sur écran & accord contradictoire"}
</span>
{isClientSigned && /* @__PURE__ */ <span className="t-small text-emerald-600 font-semibold flex items-center gap-1">
<CheckCircle2 size={14} />
{language === "ar" ? "تم توثيق التوقيع" : "Signé & certifié"}
</span>}
</div>
<button type="button" data-no-liquid="true" data-sq="empty" data-sq-border="dashed" data-sq-stroke-w={2} onClick={() => setIsClientSigned(true)} className={`w-full h-28 flex items-center justify-center cursor-pointer transition-colors ${isClientSigned ? "bg-emerald-50/50 dark:bg-emerald-950/20 [--sq-stroke:#34d399]" : "bg-white dark:bg-[#191716] hover:[--sq-stroke:#d4522f]"}`}>
{isClientSigned ? /* @__PURE__ */ <span className="text-center space-y-1 block">
<span className="italic t-dialog text-black dark:text-white font-semibold block">{activeVehicle?.ownerName || 'Client'}</span>
<span className="t-cap text-black/55 dark:text-white/55 tabular-nums block">
{new Date().toLocaleString()}
{" · Signature Numérique Reçue"}
</span>
</span> : /* @__PURE__ */ <span className="text-center t-cap text-black/55 dark:text-white/55 space-y-1 block">
<PenTool size={20} className="mx-auto text-black/55 dark:text-white/55" />
<span className="block">
{language === "ar" ? "انقر هنا لتسجيل توقيع الزبون الرقمي" : "Cliquez ici pour apposer la signature du client sur verre"}
</span>
</span>}
</button>
</div>
</div>}
</div>
<div className="flex items-center justify-between px-6 py-4 border-t border-[var(--atr-divider)] bg-[#F5F1EC]/60 dark:bg-[#22201E]">
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
</KineticModalShell>
	);
};

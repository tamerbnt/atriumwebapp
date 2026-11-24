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
import { t } from '../../../utils/i18n';
import { RepairOrder, VehicleAsset, WorkshopBay, DamageMarker } from './garageData';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { Button } from '@/atrium/core';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { LiveSwitch } from '../../ui/live/LiveSwitch';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';

interface AutoOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: VehicleAsset[];
  bays?: WorkshopBay[];
  onSave: (order: RepairOrder) => void;
}

export const AutoOrderModal: React.FC<AutoOrderModalProps> = ({ isOpen, onClose, vehicles, bays = [], onSave }) => {
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
	const [estimatedCost, setEstimatedCost] = React.useState("");
	const [assignedBayId, setAssignedBayId] = React.useState(bays[0]?.id || "bay_01");
	const [technician, setTechnician] = React.useState(currentUser?.fullName || "Chef Atelier");
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
		setEstimatedCost("");
		setTechnician(currentUser?.fullName || "Chef Atelier");
		setIsClientSigned(false);
	}, [isOpen, vehicles, currentUser?.fullName]);
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
		const activeAccountId = (activeVehicle.accountId || currentBranch?.accountId || account?.id || '').trim();
		const activeBranchId = (currentBranch?.id || activeVehicle.branchId || '').trim();
		if (!activeAccountId || !activeBranchId) {
			showToast({
				type: 'error',
				title: t('tenant_context_missing_title', language),
				message: t('tenant_context_missing_msg', language),
			});
			return;
		}
		const assignedBay = bays.find((b: WorkshopBay) => b.id === assignedBayId);
		const newOrder: RepairOrder = {
			id: `ro_${Date.now()}`,
			accountId: activeAccountId,
			businessId: currentBusiness?.id || activeVehicle.businessId || currentBranch?.businessId || '',
			branchId: activeBranchId,
			staffId: currentUser?.id || '',
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
			estimatedCostDzd: estimatedCost.trim() ? parseFloat(estimatedCost) || 0 : 0,
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
<div className="px-6 pt-3 pb-2 border-b border-[var(--atr-divider)] bg-white dark:bg-[#262422]">
<LiveSegmentedControl
  value={activeTab}
  onChange={setActiveTab}
  options={[
    { value: "intake", label: language === "ar" ? "1. الدخول والعداد" : "1. Véhicule" },
    { value: "walkaround", label: (language === "ar" ? "2. الهيكل" : "2. Carrosserie") + (damageMarkers.length > 0 ? ` (${damageMarkers.length})` : "") },
    { value: "dispatch", label: language === "ar" ? "3. العطل والجسر" : "3. Diagnostic" },
    { value: "signature", label: language === "ar" ? "4. التوقيع" : "4. Signature" }
  ]}
  size="sm"
  fullWidth
/>
</div>
<div className="flex-1 overflow-y-auto p-6 space-y-6">
{activeTab === "intake" && <div className="space-y-5 animate-in fade-in">
<div data-sq="card" data-sq-border="none" className="p-4 bg-[#F3EDE7] dark:bg-[#22201E] space-y-4">
<LabelSelect field="orderVehicleId" label={language === "ar" ? "المركبة والماتريكيل" : "Véhicule & Matricule"} value={selectedVehicleId} onChange={setSelectedVehicleId} options={vehicleOptions} width="100%" height={40} corner={12} />
{activeVehicle && <div data-sq="ctl" data-sq-border="none" className="grid grid-cols-2 sm:grid-cols-4 gap-3 t-cap bg-white dark:bg-[#191716] p-3">
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
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
<div className="space-y-2.5">
<LabelInput field="orderMileage" label={language === "ar" ? "العداد الفعلي عند الدخول (كم)" : "Kilométrage actuel compteur (km)"} type="number" value={currentMileage} onChange={setCurrentMileage} width="100%" height={40} corner={12} required />
<div className="flex items-center justify-between gap-2 px-1 pt-0.5 t-cap text-black/70 dark:text-white/75">
<span>{language === "ar" ? "العداد مستبدل أو معاد للصفر" : "Compteur remplacé ou remis à zéro"}</span>
<LiveSwitch checked={isOdometerReplaced} onCheckedChange={setIsOdometerReplaced} />
</div>
</div>
<LabelSelect
  field="orderFuelLevel"
  label={language === "ar" ? "مستوى الوقود" : "Niveau de carburant"}
  value={fuelLevel}
  onChange={setFuelLevel}
  options={[
    { value: "0", label: language === "ar" ? "فارغ (0%)" : "Vide (0%)" },
    { value: "25", label: "25%" },
    { value: "50", label: "50%" },
    { value: "75", label: "75%" },
    { value: "100", label: language === "ar" ? "ممتلئ (100%)" : "Plein (100%)" }
  ]}
  width="100%"
  height={40}
  corner={12}
/>
</div>
<div data-sq="card" data-sq-border="none" className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] space-y-3">
<div className="flex flex-wrap items-center justify-between gap-2">
<span className="t-small font-semibold text-black dark:text-white">
{language === "ar" ? "الملحقات والأغراض المسلمة في المركبة" : "Accessoires & Objets à Bord"}
</span>
<div className="flex items-center gap-2 t-cap text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-full">
<span>{language === "ar" ? "المركبة غير نظيفة (فحص مشروط)" : "Véhicule très sale (réserve carrosserie)"}</span>
<LiveSwitch checked={isVehicleDirty} onCheckedChange={setIsVehicleDirty} />
</div>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 t-cap">
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
										].map((item) => <div key={item.key} data-sq="ctl" data-sq-border="none" className="flex items-center justify-between gap-2 p-2.5 bg-white dark:bg-[#2B2825]">
<span className="text-black/70 dark:text-white/75">{item.label}</span>
<LiveSwitch
  checked={accessories[item.key]}
  onCheckedChange={(checked) => setAccessories((prev) => ({
    ...prev,
    [item.key]: checked
  }))}
/>
</div>)}
</div>
</div>
</div>}
{activeTab === "walkaround" && <div className="space-y-4 animate-in fade-in">
<div data-sq="card" data-sq-border="none" className="flex flex-col gap-3 p-3 bg-[#F5F1EC] dark:bg-[#22201E]">
<LiveSegmentedControl
  value={activeCarView}
  onChange={setActiveCarView}
  options={[
    { value: "front", label: language === "ar" ? "الواجهة الأمامية" : "Face Avant" },
    { value: "rear", label: language === "ar" ? "الواجهة الخلفية" : "Face Arrière" },
    { value: "left", label: language === "ar" ? "الجانب الأيسر" : "Côté Gauche" },
    { value: "right", label: language === "ar" ? "الجانب الأيمن" : "Côté Droit" }
  ]}
  size="sm"
  fullWidth
/>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
<LabelSelect
  field="orderDamageType"
  label={language === "ar" ? "نوع الضرر" : "Type de dommage"}
  value={selectedDamageType}
  onChange={setSelectedDamageType}
  options={[
    { value: "scratch", label: "Rayure (Scratch)" },
    { value: "dent", label: "Bosse (Dent)" },
    { value: "crack", label: "Fissure / Cassure" },
    { value: "paint_chip", label: "Éclat peinture" },
    { value: "missing_part", label: "Pièce manquante" }
  ]}
  width="100%"
  height={40}
  corner={12}
/>
<LiveSegmentedControl
  value={selectedSeverity}
  onChange={setSelectedSeverity}
  options={[
    { value: "minor", label: language === "ar" ? "خفيف" : "Léger" },
    { value: "moderate", label: language === "ar" ? "متوسط" : "Moyen" },
    { value: "severe", label: language === "ar" ? "بليغ" : "Important" }
  ]}
  size="sm"
  fullWidth
/>
</div>
</div>
<div data-sq="card" data-sq-border="solid" data-surface="dark" className="relative w-full h-64 sm:h-72 bg-[#191716] dark:bg-[#131211] [--sq-stroke:var(--sq-stroke-obsidian)] flex items-center justify-center overflow-hidden group">
<button type="button" onClick={handleCanvasClick} aria-label={language === "ar" ? "انقر على المخطط لتسجيل الضرر" : "Cliquer sur le schéma pour consigner un dommage"} className="w-full h-full relative flex items-center justify-center p-4 cursor-crosshair bg-transparent border-0">
<svg viewBox="0 0 400 200" className="w-full max-w-md h-full opacity-70 group-hover:opacity-90 transition-opacity">
{activeCarView === "front" && <g stroke="#d4522f" strokeWidth="2.5" fill="none">
<rect x="70" y="60" width="260" height="90" rx="30" />
<path d="M100 60 L130 20 L270 20 L300 60" />
<circle cx="110" cy="100" r="18" />
<circle cx="290" cy="100" r="18" />
<rect x="150" y="90" width="100" height="25" rx="5" />
<line x1="80" y1="140" x2="320" y2="140" strokeWidth="4" />
</g>}
{activeCarView === "rear" && <g stroke="#d4522f" strokeWidth="2.5" fill="none">
<rect x="70" y="60" width="260" height="90" rx="25" />
<path d="M100 60 L120 25 L280 25 L300 60" />
<rect x="90" y="85" width="40" height="20" rx="4" fill="#EF4444" fillOpacity="0.4" />
<rect x="270" y="85" width="40" height="20" rx="4" fill="#EF4444" fillOpacity="0.4" />
<rect x="160" y="95" width="80" height="30" rx="4" />
<circle cx="200" cy="75" r="8" />
</g>}
{(activeCarView === "left" || activeCarView === "right") && <g stroke="#d4522f" strokeWidth="2.5" fill="none">
<path d="M40 120 L80 120 L110 70 L260 70 L320 100 L360 120 L360 140 L40 140 Z" />
<circle cx="100" cy="140" r="24" strokeWidth="3" />
<circle cx="300" cy="140" r="24" strokeWidth="3" />
<line x1="180" y1="70" x2="180" y2="140" />
<rect x="130" y="100" width="15" height="5" rx="2" />
<rect x="210" y="100" width="15" height="5" rx="2" />
</g>}
</svg>
{damageMarkers.filter((m) => m.view === activeCarView).map((marker, idx) => <span key={marker.id} style={{
													left: `${marker.xPercent}%`,
													top: `${marker.yPercent}%`
												}} className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[var(--brand-fill,#C9461F)] text-white t-small font-semibold tabular-nums flex items-center justify-center border-2 border-white shadow-lg animate-in zoom-in pointer-events-none" title={`${marker.damageType} (${marker.severity})`}>{idx + 1}</span>)}
<span className="absolute bottom-3 start-4 t-cap text-white/75 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-xs pointer-events-none">
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
{damageMarkers.length === 0 ? <p className="t-cap text-black/55 dark:text-white/55 italic">
{language === "ar" ? "لم يتم تسجيل أي خدوش. انقر على المخطط أعلاه لتحديد الأضرار." : "Aucun dommage répertorié. Cliquez sur le schéma ci-dessus pour ajouter des repères."}
</p> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
{damageMarkers.map((m, idx) => <div key={m.id} data-sq="ctl" data-sq-border="none" className="flex items-center justify-between p-3 bg-[#F5F1EC] dark:bg-[#2B2825] t-cap">
<div className="flex items-center gap-2">
<span className="w-5 h-5 rounded-full bg-[var(--brand-fill,#C9461F)] text-white flex items-center justify-center t-small font-semibold">{idx + 1}</span>
<div>
<span className="font-semibold text-black dark:text-white capitalize">{m.damageType}</span>
<span className="text-black/55 dark:text-white/55 ms-1.5 capitalize">
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
{activeTab === "dispatch" && <div className="space-y-4 animate-in fade-in">
<LabelInput field="orderDiagnostic" label={language === "ar" ? "وصف العطل والشكوى الأولية" : "Symptômes & motif de dépose (Panne constatée)"} value={diagnostic} onChange={setDiagnostic} placeholder="Ex: Bruit suspect au freinage, voyant moteur orange, révision vidange..." width="100%" height={40} corner={12} required />
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
<LabelInput field="orderEstimatedCost" label={language === "ar" ? "التقدير المالي الأولي (د.ج)" : "Devis prévisionnel (DA HT)"} type="number" placeholder="18500" value={estimatedCost} onChange={setEstimatedCost} width="100%" height={40} corner={12} />
<LabelSelect field="orderAssignedBayId" label={language === "ar" ? "جسر الرفع / المنصة" : "Pont élévateur assigné"} value={assignedBayId} onChange={setAssignedBayId} options={bayOptions} width="100%" height={40} corner={12} />
<LabelSelect field="orderTechnician" label={language === "ar" ? "الميكانيكي المكلف" : "Technicien responsable"} value={technician} onChange={setTechnician} options={[
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
											]} width="100%" height={40} corner={12} />
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
{activeTab === "signature" && <div className="space-y-4 animate-in fade-in">
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
{isClientSigned && <span className="t-small text-emerald-600 font-semibold flex items-center gap-1">
<CheckCircle2 size={14} />
{language === "ar" ? "تم توثيق التوقيع" : "Signé & certifié"}
</span>}
</div>
<button type="button" data-no-liquid="true" data-sq="empty" data-sq-border="dashed" data-sq-stroke-w={2} onClick={() => setIsClientSigned(true)} className={`w-full h-28 flex items-center justify-center cursor-pointer transition-colors ${isClientSigned ? "bg-emerald-50/50 dark:bg-emerald-950/20 [--sq-stroke:#34d399]" : "bg-white dark:bg-[#191716] hover:[--sq-stroke:#d4522f]"}`}>
{isClientSigned ? <span className="text-center space-y-1 block">
<span className="italic t-dialog text-black dark:text-white font-semibold block">{activeVehicle?.ownerName || 'Client'}</span>
<span className="t-cap text-black/55 dark:text-white/55 tabular-nums block">
{new Date().toLocaleString()}
{" · Signature Numérique Reçue"}
</span>
</span> : <span className="text-center t-cap text-black/55 dark:text-white/55 space-y-1 block">
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
{activeTab !== "intake" && <Button type="button" tone="soft" size={40} onClick={() => {
								if (activeTab === "walkaround") setActiveTab("intake");
								if (activeTab === "dispatch") setActiveTab("walkaround");
								if (activeTab === "signature") setActiveTab("dispatch");
							}}>{language === "ar" ? "السابق" : "Précédent"}</Button>}
</div>
<div className="flex items-center gap-2">
<Button type="button" tone="soft" size={40} onClick={onClose}>{language === "ar" ? "إلغاء" : "Annuler"}</Button>
{activeTab !== "signature" ? <Button type="button" tone="accent" size={40} onClick={() => {
								if (activeTab === "intake") setActiveTab("walkaround");
								else if (activeTab === "walkaround") setActiveTab("dispatch");
								else if (activeTab === "dispatch") setActiveTab("signature");
							}}>{language === "ar" ? "التالي" : "Suivant"}</Button> : <Button type="button" tone="accent" size={40} onClick={handleSubmit} leading={<CheckCircle2 size={16} />}>{language === "ar" ? "اعتماد أمر التصليح (Créer OR)" : "Valider & Ouvrir l'OR"}</Button>}
</div>
</div>
</div>
</KineticModalShell>
	);
};

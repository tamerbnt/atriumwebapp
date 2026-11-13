import React, { useState, useEffect, useMemo } from 'react';
import { useAtriumStore } from '../../../services/store';
import { PMAttendance, PMMission, PMTalent } from '../../../types/index';
import { MobilePhoneSimulator } from './MobilePhoneSimulator';
import {
  Users,
  Clock,
  Camera,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Star,
  MapPin,
  Car,
  Phone,
  ShieldCheck,
  Plus,
  Send,
  Lock,
  ExternalLink,
  Radio,
  FileText,
  Calendar,
  Sparkles,
  ChevronRight,
  UserPlus,
  Building2,
  ChevronDown,
  Download,
  Pin,
  Trash2,
  Smartphone,
} from 'lucide-react';
import { LabelInput } from '../../ui/LabelInput';
import { Seek } from '../../ui/Seek';
import { LabelSelect } from '../../ui/LabelSelect';
import { FilterSelect } from '../../ui/FilterSelect';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

interface ProjectSuperviseurViewProps {
  initialTab?: 'missions' | 'attendance' | 'staffing' | 'expense';
}



export const ProjectSuperviseurView: React.FC<ProjectSuperviseurViewProps> = ({ initialTab }) => {
	const { t, language, isRtl } = useTranslation();
	const { currentBranch, branches, switchBranch, pmMissions, pmTalents, pmAttendances, updatePmAttendanceStatus, batchUpdatePmAttendanceStatus, closePmRollCall, addPmExpense, batchDeletePmMissions, resetPmMockData, activePmSubScreen, setActivePmSubScreen, isSyncing, networkMode, retryCloudSync, lastSyncedAt } = useAtriumStore();
	const [isBranchDropdownOpen, setIsBranchDropdownOpen] = React.useState(false);
	const [showPhoneSimulator, setShowPhoneSimulator] = React.useState(false);
	const activeTab = activePmSubScreen === "attendance" || initialTab === "attendance" ? "attendance" : activePmSubScreen === "staffing" || initialTab === "staffing" ? "staffing" : activePmSubScreen === "expense" || initialTab === "expense" ? "expense" : "missions";
	const setActiveTab = (tab: any) => {
		setActivePmSubScreen(tab);
	};
	const [selectedMissionId, setSelectedMissionId] = React.useState(pmMissions[0]?.id || "");
	const [expenseTitle, setExpenseTitle] = React.useState("");
	const [expenseAmount, setExpenseAmount] = React.useState("2500");
	const [expenseCategory, setExpenseCategory] = React.useState("materials");
	const [expensePhotoUrl, setExpensePhotoUrl] = React.useState("https://images.unsplash.com/photo-1554415707-9e49fe74a64c?w=500&auto=format&fit=crop&q=80");
	const [expenseSubmitted, setExpenseSubmitted] = React.useState(false);
	const [missionSearch, setMissionSearch] = React.useState("");
	const [wilayaFilter, setWilayaFilter] = React.useState("all");
	const [selectedMissionIds, setSelectedMissionIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedMissionIds, setPinnedMissionIds] = React.useState(/* @__PURE__ */ new Set());
	const [selectedAttendanceIds, setSelectedAttendanceIds] = React.useState(/* @__PURE__ */ new Set());
	const [pinnedAttendanceIds, setPinnedAttendanceIds] = React.useState(/* @__PURE__ */ new Set());
	const [talentSearch, setTalentSearch] = React.useState("");
	const [minRatingFilter, setMinRatingFilter] = React.useState(4);
	const [requireVehicle, setRequireVehicle] = React.useState(false);
	const selectedMission = pmMissions.find((m) => m.id === selectedMissionId) || pmMissions[0];
	const missionAttendances = pmAttendances.filter((a) => a.missionId === selectedMission?.id);
	const presentCount = missionAttendances.filter((a) => a.status === "present").length;
	const lateCount = missionAttendances.filter((a) => a.status === "late").length;
	const absentCount = missionAttendances.filter((a) => a.status === "absent").length;
	const isMissionLocked = missionAttendances.length > 0 && missionAttendances.every((a) => a.isLocked);
	const filteredMissions = React.useMemo(() => {
		return pmMissions.filter((m) => {
			const q = missionSearch.toLowerCase().trim();
			const matchQ = !q || m.code.toLowerCase().includes(q) || m.title.toLowerCase().includes(q) || m.venueName.toLowerCase().includes(q) || m.wilayaName.toLowerCase().includes(q);
			const matchWilaya = wilayaFilter === "all" || m.wilayaCode === wilayaFilter;
			return matchQ && matchWilaya;
		});
	}, [
		pmMissions,
		missionSearch,
		wilayaFilter
	]);
	const missionColumns = React.useMemo(() => [
		{
			key: "code",
			header: "Réf & Titre Mission",
			width: "2.5*",
			minWidth: "220px",
			renderCell: (m: any) => {
				const isPinned = pinnedMissionIds.has(m.id);
				return /* @__PURE__ */ <div className="flex items-center gap-2.5">
<button type="button" onClick={(e) => {
							e.stopPropagation();
							setPinnedMissionIds((prev) => {
								const next = new Set(prev);
								if (next.has(m.id)) next.delete(m.id);
								else next.add(m.id);
								return next;
							});
						}} className={`p-1 rounded-lg transition-colors cursor-pointer ${isPinned ? "text-[#d4522f] bg-[#d4522f]/10" : "text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80"}`}><Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-current" : ""}`} /></button>
<div>
<div className="flex items-center gap-2">
<span className="font-mono font-bold text-xs text-[#d4522f]">{m.code}</span>
<span className="font-semibold text-xs text-black dark:text-white">{m.title}</span>
</div>
<div className="text-[11px] text-black/55 dark:text-white/55 truncate max-w-[200px]">{m.projectTitle}</div>
</div>
</div>;
			}
		},
		{
			key: "venue",
			header: "Lieu & Wilaya",
			width: "2*",
			minWidth: "180px",
			renderCell: (m: any) => /* @__PURE__ */ <div className="text-xs text-black/70 dark:text-white/75">
<div className="font-semibold">{m.venueName}</div>
<div className="text-[11px] text-black/55 dark:text-white/55">
{m.address}
{" ("}
{m.wilayaName}
)
</div>
</div>
		},
		{
			key: "dates",
			header: "Date & Horaires",
			width: "1.5*",
			minWidth: "150px",
			renderCell: (m: any) => /* @__PURE__ */ <div className="text-xs text-black/70 dark:text-white/75 font-mono">
<div>{m.startDate}</div>
<div className="text-[11px] text-black/55 dark:text-white/55">
{m.dailyStartHour}
{" - "}
{m.dailyEndHour}
</div>
</div>
		},
		{
			key: "team",
			header: "Effectif Requis",
			width: "1.2*",
			minWidth: "120px",
			align: "center",
			renderCell: (m: any) => /* @__PURE__ */ <span className="font-mono text-xs font-bold text-black dark:text-white">
{m.requiredStaffCount}
{" pers."}
</span>
		},
		{
			key: "status",
			header: "Statut",
			width: "1.2*",
			minWidth: "120px",
			align: "center",
			renderCell: (m: any) => {
				const b = ({
					live_today: {
						label: "En direct",
						bg: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
						text: ""
					},
					scheduled: {
						label: "Planifiée",
						bg: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
						text: ""
					},
					completed: {
						label: "Terminée",
						bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
						text: ""
					}
				} as Record<string, any>)[m.status] || {
					label: m.status,
					bg: "bg-[#F3EDE7] text-black/70 dark:text-white/75"
				};
				return /* @__PURE__ */ <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${b.bg}`}>{b.label}</span>;
			}
		},
		{
			key: "action",
			header: "Pointage",
			width: "1*",
			minWidth: "110px",
			align: "right",
			renderCell: (m: any) => /* @__PURE__ */ <AtriumButton type="button" size="xs" variant="primary" onClick={() => {
					setSelectedMissionId(m.id);
					setActiveTab("attendance");
				}} className="ml-auto">Pointer ➔</AtriumButton>
		}
	], [pinnedMissionIds]);
	const attendanceColumns = React.useMemo(() => [
		{
			key: "talent",
			header: "Animateur Terrain",
			width: "2.5*",
			minWidth: "220px",
			renderCell: (att: any) => /* @__PURE__ */ <div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-full bg-[#F3EDE7] dark:bg-neutral-800 flex items-center justify-center font-bold text-xs text-[#d4522f] shrink-0">{att.talentName.substring(0, 2).toUpperCase()}</div>
<div>
<div className="font-semibold text-xs text-black dark:text-white">{att.talentName}</div>
<div className="text-[11px] text-black/55 dark:text-white/55 font-mono">
{"Arrivée : "}
{att.checkInTime || "Non pointé"}
</div>
</div>
</div>
		},
		{
			key: "rate",
			header: "Forfait Journée",
			width: "1.5*",
			minWidth: "140px",
			align: "right",
			renderCell: (att: any) => /* @__PURE__ */ <div className="font-mono text-xs font-bold text-black dark:text-white tabular-nums">{formatMoney(att.grossPayableDzd, "DZD")}</div>
		},
		{
			key: "status",
			header: "État Présence",
			width: "2*",
			minWidth: "200px",
			align: "center",
			renderCell: (att: any) => {
				if (isMissionLocked) return /* @__PURE__ */ <span className="font-semibold text-xs text-black/70 dark:text-white/75 capitalize">
{att.status}
{" (Verrouillé)"}
</span>;
				return /* @__PURE__ */ <div className="flex items-center gap-1">
<button type="button" onClick={() => updatePmAttendanceStatus(att.id, "present")} className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${att.status === "present" ? "bg-emerald-600 text-white" : "bg-[#F3EDE7] dark:bg-neutral-800 text-black/70 dark:text-white/75 hover:bg-emerald-50"}`}>Présent</button>
<button type="button" onClick={() => updatePmAttendanceStatus(att.id, "late", 15)} className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${att.status === "late" ? "bg-amber-500 text-white" : "bg-[#F3EDE7] dark:bg-neutral-800 text-black/70 dark:text-white/75 hover:bg-amber-50"}`}>Retard</button>
<button type="button" onClick={() => updatePmAttendanceStatus(att.id, "absent")} className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${att.status === "absent" ? "bg-red-600 text-white" : "bg-[#F3EDE7] dark:bg-neutral-800 text-black/70 dark:text-white/75 hover:bg-red-50"}`}>Absent</button>
</div>;
			}
		}
	], [isMissionLocked]);
	const handleCloseShift = () => {
		if (selectedMission) closePmRollCall(selectedMission.id);
	};
	const handleExpenseSubmit = (e: any) => {
		e.preventDefault();
		if (!selectedMission || !expenseTitle) return;
		addPmExpense({
			tenantId: "acc_01",
			facilityId: "branch_agency_main",
			projectId: selectedMission.projectId,
			projectTitle: selectedMission.projectTitle,
			missionId: selectedMission.id,
			missionCode: selectedMission.code,
			title: expenseTitle,
			category: expenseCategory as any,
			amountDzd: Number(expenseAmount) || 1e3,
			declaredByUserId: "talent_02",
			declaredByUserName: "Sofiane Ryad (Superviseur)",
			declaredByRole: "superviseur",
			receiptPhotoUrl: expensePhotoUrl,
			hasFiscalInvoice: false
		});
		setExpenseSubmitted(true);
		setTimeout(() => {
			setExpenseSubmitted(false);
			setExpenseTitle("");
			setActiveTab("missions");
		}, 1800);
	};
	const handleExportMissionsCsv = () => {
		const headers = [
			"Code",
			"Titre",
			"Campagne",
			"Lieu",
			"Wilaya",
			"Date",
			"Effectif Requis",
			"Statut"
		];
		const rows = filteredMissions.map((m) => [
			`"${m.code}"`,
			`"${m.title.replace(/"/g, "\"\"")}"`,
			`"${m.projectTitle.replace(/"/g, "\"\"")}"`,
			`"${m.venueName.replace(/"/g, "\"\"")}"`,
			m.wilayaName,
			m.startDate,
			m.requiredStaffCount,
			m.status
		]);
		const csvContent = "﻿" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `missions_terrain_nch_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: pmMissions.length > 0 || pmAttendances.length > 0
	});
	if (showSkeleton && (pmMissions.length === 0 && pmAttendances.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
			{
				width: "2.5*",
				minWidth: "180px"
			},
			{
				width: "1.5*",
				minWidth: "140px"
			},
			{
				width: "1.4*",
				minWidth: "130px"
			},
			{
				width: "1.2*",
				minWidth: "110px"
			}
		]} viewMode="list" isOffline={isOffline} isTimedOut={isTimedOut} lastSyncedAt={lastSyncedAt} onRetry={retryCloudSync || retry} />;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
<div>
<h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">
{activeTab === "missions" ? (language === "ar" ? "المهام" : language === "en" ? "Missions" : "Missions") : activeTab === "attendance" ? (language === "ar" ? "الحضور" : language === "en" ? "Roll Call" : "Pointage") : activeTab === "staffing" ? (language === "ar" ? "التوظيف" : language === "en" ? "Staffing" : "Équipes") : (language === "ar" ? "المصاريف" : language === "en" ? "Expenses" : "Dépenses")}
</h1>
</div>
<div className="flex items-center gap-2.5">
<button onClick={() => setShowPhoneSimulator((prev) => !prev)} className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer ${showPhoneSimulator ? "bg-[#d4522f] text-white" : "bg-white dark:bg-neutral-800 text-black/70 dark:text-white/75 border border-[#E6DED6] dark:border-neutral-700 hover:bg-[#FBF8F5]"}`}>
<Smartphone className="w-3.5 h-3.5" />
<span>Simulateur Mobile</span>
</button>
</div>
</div>
<div className="flex border-b border-[#E6DED6] dark:border-neutral-800 gap-1 overflow-x-auto">
{[
					{
						id: "missions",
						label: "Missions Terrain",
						icon: Radio,
						count: pmMissions.length
					},
					{
						id: "attendance",
						label: "Pointage Live & Paie",
						icon: Clock,
						count: missionAttendances.length
					},
					{
						id: "staffing",
						label: "Équipes",
						icon: Users,
						count: pmTalents.length
					},
					{
						id: "expense",
						label: "Déclaration Frais",
						icon: Camera
					}
				].map((tab) => {
					const Icon = tab.icon;
					const isActive = activeTab === tab.id;
					return /* @__PURE__ */ <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 py-2.5 px-4 border-b-2 font-medium text-xs whitespace-nowrap transition-colors cursor-pointer ${isActive ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white"}`}>
<Icon className="w-4 h-4" />
<span>{tab.label}</span>
{tab.count !== void 0 && tab.count > 0 && /* @__PURE__ */ <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F3EDE7] dark:bg-neutral-800 text-black/70 dark:text-white/75">{tab.count}</span>}
</button>;
				})}
</div>
<div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs space-y-4">
<div>
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">Supervision Opérationnelle & Déploiement Terrains</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">Missions Déployées</span>
<div>
<div className="text-2xl font-bold tracking-tight text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{pmMissions.length}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5">
{"Sur "}
{new Set(pmMissions.map((m) => m.wilayaCode)).size}
{" wilayas couvertes"}
</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">Talents Actifs Mobilisés</span>
<div>
<div className="text-2xl font-bold tracking-tight text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{pmTalents.filter((t) => t.status === "active").length}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5">
{"Sur "}
{pmTalents.length}
{" profils qualifiés"}
</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-white/80">SLA Conformité Clôture</span>
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">58 WILAYAS LIVE</span>
</div>
<div>
<div className="text-2xl font-black text-[#FB923C] tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">98.6%</div>
<p className="text-[11px] text-white/75 mt-0.5 flex items-center gap-1.5">
<span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
<span>Émargements géolocalisés clôturés</span>
</p>
</div>
</div>
</div>
</div>
{activeTab === "missions" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs space-y-4">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-xs">
<div className="flex flex-wrap items-center gap-3 text-xs flex-1 max-w-xl">
<Seek value={missionSearch} onChange={setMissionSearch} placeholder="Rechercher par code, lieu ou wilaya..." openWidth={360} shutSize={38} />
<FilterSelect label="Wilaya" value={wilayaFilter} onChange={(val) => setWilayaFilter(typeof val === "string" ? val : val.target?.value || val)} options={[
								{
									value: "all",
									label: language === "ar" ? "الكل" : language === "fr" ? "Toutes" : "All",
									tooltip: language === "ar" ? "جميع الولايات" : language === "fr" ? "Toutes les wilayas" : "All wilayas"
								},
								{
									value: "16",
									label: language === "ar" ? "الجزائر" : language === "fr" ? "Alger" : "Algiers",
									tooltip: "16 - Alger"
								},
								{
									value: "31",
									label: language === "ar" ? "وهران" : "Oran",
									tooltip: "31 - Oran"
								},
								{
									value: "25",
									label: language === "ar" ? "قسنطينة" : "Constantine",
									tooltip: "25 - Constantine"
								},
								{
									value: "19",
									label: language === "ar" ? "سطيف" : "Sétif",
									tooltip: "19 - Sétif"
								}
							]} />
</div>
<button onClick={handleExportMissionsCsv} className="px-3 py-1.5 text-xs font-semibold text-black/70 dark:text-white/75 bg-white dark:bg-neutral-800 border border-[#E6DED6] dark:border-neutral-700 hover:bg-[#FBF8F5] rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer">
<Download className="w-3.5 h-3.5" />
<span>Export CSV</span>
</button>
</div>
<UniversalDataCollection items={filteredMissions} keyExtractor={(m) => m.id} defaultViewMode="list" columns={missionColumns} selectedIds={selectedMissionIds} onSelectionChange={setSelectedMissionIds} renderCard={(mission) => /* @__PURE__ */ <div className="flex flex-col justify-between h-full space-y-3">
<div className="space-y-2">
<div className="flex items-center justify-between text-xs font-mono font-bold text-[#d4522f]">
<span>{mission.code}</span>
<span className="text-black/55 dark:text-white/55 font-normal">{mission.activationType}</span>
</div>
<h4 className="text-sm font-bold text-black dark:text-white line-clamp-1">{mission.title}</h4>
<div className="text-xs text-black/55 dark:text-white/55 space-y-0.5">
<div className="font-semibold text-black/70 dark:text-white/75">{mission.venueName}</div>
<div>
{mission.address}
{" ("}
{mission.wilayaName}
)
</div>
</div>
</div>
<div className="pt-3 border-t border-[#E6DED6]/60 dark:border-neutral-800 flex justify-between items-center text-xs">
<span className="font-mono text-black/55 dark:text-white/55">{mission.startDate}</span>
<button type="button" onClick={() => {
									setSelectedMissionId(mission.id);
									setActiveTab("attendance");
								}} className="text-[#d4522f] font-semibold hover:underline cursor-pointer">Pointer ➔</button>
</div>
</div>} />
</div>}
{activeTab === "attendance" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs space-y-4">
<div className="p-5 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
<div>
<div className="flex items-center gap-2">
<span className="text-xs font-bold text-[#d4522f] uppercase tracking-wider">Feuille de Présence & Pointage (Slide 9 & 10)</span>
{isMissionLocked && /* @__PURE__ */ <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F3EDE7] dark:bg-neutral-800 text-black/70 dark:text-white/75 flex items-center gap-1">
<Lock className="w-3 h-3" />
{" Verrouillé"}
</span>}
</div>
<h2 className="text-lg font-bold text-black dark:text-white mt-1 font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{selectedMission?.code}
{" · "}
{selectedMission?.title}
</h2>
<div className="text-xs text-black/55 dark:text-white/55">
{selectedMission?.venueName}
{" · "}
{selectedMission?.startDate}
{" ("}
{selectedMission?.dailyStartHour}
{" - "}
{selectedMission?.dailyEndHour}
)
</div>
</div>
<div className="flex items-center gap-3">
<div className="flex items-center gap-3 text-xs font-bold font-mono px-4 py-2 bg-[#FBF8F5] dark:bg-neutral-800 rounded-xl">
<span className="text-emerald-600">
{presentCount}
{" Présents"}
</span>
<span>·</span>
<span className="text-amber-500">
{lateCount}
{" Retards"}
</span>
<span>·</span>
<span className="text-red-500">
{absentCount}
{" Absents"}
</span>
</div>
{!isMissionLocked && /* @__PURE__ */ <button type="button" onClick={handleCloseShift} className="px-4 py-2 text-xs font-bold text-white bg-[#DC2626] hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer">
<Lock className="w-3.5 h-3.5" />
Clôturer & Transmettre Paie DG
</button>}
</div>
</div>
<UniversalDataCollection items={missionAttendances} keyExtractor={(a) => a.id} defaultViewMode="list" columns={attendanceColumns} selectedIds={selectedAttendanceIds} onSelectionChange={setSelectedAttendanceIds} renderCard={(att) => /* @__PURE__ */ <div className="flex flex-col justify-between h-full space-y-3">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-[#F3EDE7] dark:bg-neutral-800 flex items-center justify-center font-bold text-sm text-[#d4522f] shrink-0">{att.talentName.substring(0, 2).toUpperCase()}</div>
<div>
<h4 className="text-sm font-bold text-black dark:text-white line-clamp-1">{att.talentName}</h4>
<p className="text-xs text-black/55 dark:text-white/55 font-mono">
{"Arrivée : "}
{att.checkInTime || "Non pointé"}
</p>
</div>
</div>
<div className="pt-3 border-t border-[#E6DED6]/60 dark:border-neutral-800 flex items-center justify-between">
<span className="font-mono font-bold text-sm text-black dark:text-white tabular-nums">{formatMoney(att.grossPayableDzd, "DZD")}</span>
<span className={`px-2 py-0.5 rounded text-[10px] font-bold ${att.status === "present" ? "bg-emerald-100 text-emerald-700" : att.status === "late" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{att.status}</span>
</div>
</div>} />
</div>}
{activeTab === "staffing" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs space-y-4">
<div className="flex items-center justify-between">
<h3 className="text-sm font-bold text-black dark:text-white">Répertoire des Animateurs (58 Wilayas)</h3>
<span className="text-xs text-black/55 dark:text-white/55">
{pmTalents.length}
{" profils disponibles"}
</span>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
{pmTalents.slice(0, 9).map((talent) => /* @__PURE__ */ <div key={talent.id} className="p-4 rounded-xl border border-[#E6DED6] dark:border-neutral-800 bg-white dark:bg-neutral-800 flex items-center gap-3 shadow-2xs">
<img src={talent.portraitPhotoUrl} alt={talent.fullName} className="w-12 h-12 rounded-full object-cover border border-[#d4522f]" />
<div className="min-w-0">
<div className="font-bold text-xs text-black dark:text-white truncate">{talent.fullName}</div>
<div className="text-[11px] text-black/55 dark:text-white/55">
{talent.wilayaName}
{" · "}
{talent.commune}
</div>
<div className="flex items-center gap-1 font-mono text-[11px] text-amber-500 font-bold mt-1">
<Star className="w-3 h-3 fill-current" />
<span>{talent.consolidatedScore}</span>
</div>
</div>
</div>)}
</div>
</div>}
{activeTab === "expense" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-[#141312] rounded-[24px] p-5 border border-[#E6DED6] dark:border-[#33302D] shadow-2xs space-y-4">
<div className="p-6 bg-white dark:bg-neutral-800 rounded-2xl border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs max-w-xl mx-auto space-y-4">
<div>
<span className="text-xs font-bold text-[#d4522f] uppercase tracking-wider block">Dépense d'Urgence Terrain (Slide 11)</span>
<h3 className="text-lg font-bold text-black dark:text-white mt-0.5">Frais de Régie & Consommables</h3>
</div>
{expenseSubmitted && /* @__PURE__ */ <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">Dépense transmise à la Direction pour arbitrage !</div>}
<form onSubmit={handleExpenseSubmit} className="space-y-4">
<LabelInput field="ExpTitle" label="Motif du Frais" value={expenseTitle} onChange={setExpenseTitle} required height={44} corner={12} />
<LabelInput field="ExpAmount" label="Montant (DZD)" type="number" value={expenseAmount} onChange={setExpenseAmount} required height={44} corner={12} />
<FilterSelect label="Catégorie de Frais" value={expenseCategory} onChange={(val) => setExpenseCategory(typeof val === "string" ? val : val.target?.value || val)} options={[
										{
											value: "materials",
											label: language === "ar" ? "مستلزمات" : language === "fr" ? "Fournitures" : "Supplies",
											tooltip: "Fournitures stand / adhésif / scotch"
										},
										{
											value: "catering",
											label: language === "ar" ? "إطعام" : language === "fr" ? "Pauses" : "Refreshments",
											tooltip: "Eau minérale & pauses animateurs"
										},
										{
											value: "transport",
											label: language === "ar" ? "نقل" : language === "fr" ? "Transport" : "Transit",
											tooltip: "Stationnement & péage autoroute"
										}
									]} />
<AtriumButton type="submit" variant="primary" className="w-full" icon={<Plus className="w-4 h-4" />}>Soumettre le Reçu à la Direction</AtriumButton>
</form>
</div>
</div>}
{showPhoneSimulator && /* @__PURE__ */ <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
<div className="relative">
<button type="button" onClick={() => setShowPhoneSimulator(false)} className="absolute -top-10 right-0 text-white font-bold text-xs bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-full cursor-pointer flex items-center gap-1">Fermer le Simulateur</button>
<MobilePhoneSimulator title="Superviseur Terrain" subtitle="PWA Pointage & Émargement">
<div className="p-4 space-y-4">
<div className="p-3 bg-[#FBF8F5] dark:bg-neutral-800 rounded-xl border border-[#E6DED6] dark:border-neutral-700">
<div className="text-xs font-bold text-[#d4522f]">{selectedMission?.code || "MIS-104"}</div>
<div className="text-sm font-bold text-black dark:text-white">{selectedMission?.title || "Activation Terrain"}</div>
<div className="text-[11px] text-black/55 dark:text-white/55">
{selectedMission?.venueName}
{" ("}
{selectedMission?.wilayaName}
)
</div>
</div>
<div className="space-y-2">
<div className="text-xs font-bold text-black/70 dark:text-white/75">
Équipe Affectée (
{missionAttendances.length}
{" animateurs)"}
</div>
{missionAttendances.map((att) => /* @__PURE__ */ <div key={att.id} className="p-3 bg-white dark:bg-neutral-800 rounded-xl border border-[#E6DED6] dark:border-neutral-700 flex items-center justify-between text-xs shadow-xs">
<div>
<div className="font-semibold text-black dark:text-white">{att.talentName}</div>
<div className="text-[10px] text-black/55 dark:text-white/55 font-mono">
{att.status.toUpperCase()}
{" · "}
{formatMoney(att.grossPayableDzd, "DZD")}
</div>
</div>
<span className={`px-2 py-0.5 rounded text-[10px] font-bold ${att.status === "present" ? "bg-emerald-100 text-emerald-700" : att.status === "late" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{att.status}</span>
</div>)}
</div>
</div>
</MobilePhoneSimulator>
</div>
</div>}
</div>;
};

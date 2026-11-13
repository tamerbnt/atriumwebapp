import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Home,
  ChevronDown,
  Building2,
  Check,
  Clock,
  DollarSign,
  History,
  QrCode,
  List,
  LayoutGrid,
} from 'lucide-react';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useStaffFoundation } from '../../common/staff/useStaffFoundation';
import { QuickPointageModal } from '../../common/staff/QuickPointageModal';
import { StaffModal } from '../../modals/StaffModal';
import { StaffInspectorDrawer } from '../../common/StaffInspectorDrawer';
import { StaffMember, StaffLifecycleStatus } from '../../../types/index';
import { StaffAttendanceSubView } from '../../common/staff/StaffAttendanceSubView';
import { StaffPayrollSubView } from '../../common/staff/StaffPayrollSubView';
import { StaffHistorySubView } from '../../common/staff/StaffHistorySubView';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { AtriumButton } from '../../ui/AtriumButton';
import { LiquidButton } from '@/atrium';
import { Seek } from '../../ui/Seek';
import { useAtriumStore } from '../../../services/store';
import { t } from '../../../utils/i18n';



export const MembershipStaffView: React.FC<any> = () => {
	const foundation = useStaffFoundation({ category: "membership_session" });
	const { isAr, isEn, language } = foundation;
	const { businesses, branches, currentBusinessId, currentBranch, switchBusiness, switchBranch, terminology, showToast } = useAtriumStore();
	const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = React.useState(false);
	const quickStatusOptions = React.useMemo(() => [
		{
			value: "all",
			label: isAr ? "الكل" : isEn ? "All" : "Tous",
			tooltip: isAr ? "جميع أفراد الطاقم" : isEn ? "All staff members" : "Tous les collaborateurs"
		},
		{
			value: "active",
			label: isAr ? "نشط" : isEn ? "Active" : "Actifs",
			tooltip: isAr ? "الموظفون في الخدمة حالياً" : isEn ? "On active duty" : "Collaborateurs en poste"
		},
		{
			value: "on_leave",
			label: isAr ? "عطلة" : isEn ? "Leave" : "Congé",
			tooltip: isAr ? "في عطلة مجدولة" : isEn ? "On scheduled leave" : "Collaborateurs en congé"
		},
		{
			value: "frozen",
			label: isAr ? "موقوف" : isEn ? "Paused" : "Suspendu",
			tooltip: isAr ? "حساب موقوف مؤقتاً" : isEn ? "Temporarily suspended" : "Compte suspendu"
		}
	], [isAr, isEn]);
	const handleExportCSV = () => {
		try {
			const staffRows = foundation.filteredStaff;
			if (staffRows.length === 0) {
				showToast(isAr ? "لا يوجد مدربون للتصدير" : "Aucun collaborateur à exporter", "info");
				return;
			}
			const headers = [
				"Nom & Prénom",
				"Rôle / Spécialité",
				"Statut",
				"Téléphone",
				"Contrat",
				"Salaire de Base (DZD)",
				"Badge RFID"
			];
			const rows = staffRows.map((s) => [
				`"${s.fullName.replace(/"/g, "\"\"")}"`,
				`"${(s.role || "").replace(/"/g, "\"\"")}"`,
				`"${s.status}"`,
				`"${s.phoneNumber || ""}"`,
				`"${s.contractType || "CDI"}"`,
				`"${s.salary || 0}"`,
				`"${s.badgeToken || s.cardId || ""}"`
			]);
			const csvContent = "data:text/csv;charset=utf-8,﻿" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
			const encodedUri = encodeURI(csvContent);
			const link = document.createElement("a");
			link.setAttribute("href", encodedUri);
			link.setAttribute("download", `staff_export_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			showToast(isAr ? "تم تصدير ملف الموظفين بنجاح" : "Exportation des collaborateurs réussie", "success");
		} catch (e) {
			console.error(e);
			showToast("Erreur lors de l'exportation CSV", "error");
		}
	};
	const columns = [
		{
			id: "fullName",
			header: isAr ? "المدرب / الموظف" : isEn ? "Coach / Staff" : "Coach & Collaborateur",
			accessorKey: "fullName",
			sortable: true,
			cell: (member: any) => /* @__PURE__ */ <div className="flex items-center gap-3">
<div className="w-9 h-9 rounded-full bg-[#d4522f]/15 text-[#d4522f] font-bold text-xs flex items-center justify-center shrink-0">{member.fullName.slice(0, 2).toUpperCase()}</div>
<div className="min-w-0">
<div className="font-semibold text-black dark:text-white text-xs truncate">{member.fullName}</div>
<div className="text-[11px] text-black/62 dark:text-white/65 truncate flex items-center gap-1.5">
<span>{member.role}</span>
{member.chairOrStudio && /* @__PURE__ */ <>
<span>·</span>
<span className="text-[#d4522f] font-medium">{member.chairOrStudio}</span>
</>}
</div>
</div>
</div>
		},
		{
			id: "status",
			header: isAr ? "حالة العمل" : isEn ? "Duty Status" : "Statut Présence",
			accessorKey: "status",
			cell: (member: any) => {
				const isPresent = member.isClockedInToday || member.attendanceLogs?.some((l: any) => (l.timestamp || "").slice(0, 10) === (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) && l.type === "in");
				return /* @__PURE__ */ <div className="flex items-center gap-2">
<span className={`w-2 h-2 rounded-full ${member.status === "active" ? isPresent ? "bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950" : "bg-emerald-500" : member.status === "on_leave" ? "bg-amber-500" : member.status === "frozen" ? "bg-rose-500" : "bg-[#8A8178]"}`} />
<span className="text-xs font-medium text-black dark:text-white">
{member.status === "active" ? isPresent ? isAr ? "متواجد بالصالة" : isEn ? "In Gym (Shift On)" : "Présent en Salle" : isAr ? "نشط" : isEn ? "Active" : "En Poste" : member.status === "on_leave" ? isAr ? "عطلة" : isEn ? "On Leave" : "En Congé" : member.status === "frozen" ? isAr ? "موقوف" : isEn ? "Suspended" : "Suspendu" : isAr ? "منتهي" : isEn ? "Terminated" : "Fin de Contrat"}
</span>
</div>;
			}
		},
		{
			id: "badgeToken",
			header: isAr ? "رمز البادج RFID" : isEn ? "RFID Badge" : "Badge Tourniquet RFID",
			accessorKey: "badgeToken",
			cell: (member: any) => /* @__PURE__ */ <span className="font-mono text-xs text-black/70 dark:text-white/75">{member.badgeToken || member.cardId || "—"}</span>
		},
		{
			id: "phoneNumber",
			header: isAr ? "الهاتف" : isEn ? "Phone" : "Téléphone",
			accessorKey: "phoneNumber",
			cell: (member: any) => /* @__PURE__ */ <span className="text-xs text-black/70 dark:text-white/75 tabular-nums font-mono">{member.phoneNumber || "—"}</span>
		},
		{
			id: "contractType",
			header: isAr ? "نوع العقد" : isEn ? "Contract" : "Contrat",
			accessorKey: "contractType",
			cell: (member: any) => /* @__PURE__ */ <span className="text-xs font-bold text-black/70 dark:text-white/75">{member.contractType || "CDI"}</span>
		},
		{
			id: "salary",
			header: isAr ? "الراتب القاعدي" : isEn ? "Base Salary" : "Salaire de Base",
			accessorKey: "salary",
			cell: (member: any) => /* @__PURE__ */ <span className="text-xs font-bold font-mono tabular-nums text-[#d4522f]">{member.salary ? `${member.salary.toLocaleString()} DZD` : "—"}</span>
		}
	];
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200 relative">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
<div className="flex items-center gap-3.5 sm:gap-4">
<div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#F3EDE7] dark:bg-white/[0.07] border border-[#E6DED6] dark:border-neutral-700/70 shadow-2xs flex items-center justify-center text-black dark:text-white"><Users size={22} /></div>
<div>
<h1 className="text-[34px] sm:text-[42px] rtl:text-[28px] rtl:sm:text-[34px] font-extrabold uppercase leading-[0.98] rtl:leading-tight tracking-[0.012em] text-black dark:text-white rtl:normal-case rtl:tracking-normal font-['Barlow_Condensed',sans-serif] rtl:font-sans">{isAr ? "الفريق" : isEn ? "Staff" : "Équipe"}</h1>
</div>
</div>
<div className="flex items-center gap-3 relative">
<AtriumButton variant="primary" size="md" onClick={foundation.handleOpenCreate} icon={<Plus size={16} strokeWidth={2.2} />} className="px-4 font-semibold shadow-xs">
<span className="text-xs sm:text-sm font-semibold">
{isAr ? "إضافة مدرب / موظف" : isEn ? "Add Coach / Staff" : "Nouveau Collaborateur"}
</span>
</AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 sm:p-6 space-y-5 border border-[#E6DED6] dark:border-neutral-800/70 shadow-2xs">
<div>
<h2 className="text-[15.5px] sm:text-[16px] font-semibold tracking-[-0.018em] text-black dark:text-white">
{isAr ? "فريق العمل ومؤشرات الحضور" : isEn ? "Workforce & Operational Health" : "Effectif & Santé Opérationnelle"}
</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-4.5 sm:p-5 rounded-[18px] bg-white dark:bg-neutral-800/90 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between min-h-[132px]">
<div>
<span className="text-[12px] font-medium text-black/68 dark:text-white/72">
{isAr ? "قاعدة الفريق النشطة" : isEn ? "Active Staff Base" : "Base active collaborateurs"}
</span>
<div className="mt-1.5">
<span className="text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md tabular-nums">
{"↗ "}
{foundation.facilityStaff.length > 0 ? Math.round(foundation.activeCount / foundation.facilityStaff.length * 100) : 0}
{"% "}
{isAr ? "نشط" : "Actifs"}
</span>
</div>
</div>
<div className="text-[30px] lg:text-[32px] leading-[0.95] font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{foundation.activeCount}</div>
</div>
<div className="p-4.5 sm:p-5 rounded-[18px] bg-white dark:bg-neutral-800/90 border border-[#E6DED6] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between min-h-[132px]">
<div>
<span className="text-[12px] font-medium text-black/68 dark:text-white/72">
{isAr ? "حضور وتأخيرات اليوم" : isEn ? "Today's Pointage & Lates" : "Pointage & Retards du Jour"}
</span>
<div className="mt-1.5">
<span className="text-[10.5px] font-semibold text-[#d4522f] bg-[#d4522f]/10 px-2 py-0.5 rounded-md tabular-nums">
{foundation.todayPresentCount}
{" "}
{isAr ? "حاضرون" : "présents"}
{" · "}
{foundation.presentPercentage}
%
</span>
</div>
</div>
<div className="text-[30px] lg:text-[32px] leading-[0.95] font-bold text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{foundation.presentPercentage}
%
</div>
</div>
<div className="p-4.5 sm:p-5 rounded-[18px] bg-[#1F1D1B] border border-white/[0.08] text-white flex flex-col justify-between min-h-[132px] shadow-sm">
<div className="flex items-center justify-between gap-2">
<span className="text-[12px] font-medium text-white/75">
{isAr ? "الكتلة الأجرية الشهرية" : isEn ? "Monthly Payroll Budget" : "Masse Salariale Mensuelle"}
</span>
<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/25">
+
{foundation.facilityStaff.length}
{" "}
{isAr ? "عضو" : "staff"}
</span>
</div>
<div>
<div className="text-[28px] lg:text-[30px] leading-[0.95] font-bold text-[#FB923C] tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{foundation.totalMonthlyPayroll.toLocaleString()}
{" DZD"}
</div>
<p className="text-[11.5px] text-white/68 mt-1.5">
{isAr ? "قوانين العمل الجزائرية، IRG 2022 و CNAS" : "Calcul statutory CNAS 9%/26% & Barème IRG 2022"}
</p>
</div>
</div>
</div>
</div>
<div className="flex items-center">
<LiveSegmentedControl value={foundation.activeSubTab} onValueChange={(val) => foundation.setActiveSubTab(val as any)} size="md" options={[
						{
							value: "directory",
							label: isAr ? "الفريق" : isEn ? "Directory" : "Annuaire",
							tooltip: isAr ? "دليل الفريق والمدربين" : isEn ? "Staff Directory" : "Annuaire & RH",
							icon: /* @__PURE__ */ <Users size={16} className="mr-1.5" />,
							count: foundation.facilityStaff.length
						},
						{
							value: "attendance",
							label: isAr ? "الحضور" : isEn ? "Attendance" : "Pointage",
							tooltip: isAr ? "الحضور والتوقيع اليومي" : isEn ? "Attendance & Clock-in" : "Pointage & Présence",
							icon: /* @__PURE__ */ <Clock size={16} className="mr-1.5" />,
							count: foundation.todayPresentCount
						},
						{
							value: "payroll",
							label: isAr ? "الرواتب" : isEn ? "Payroll" : "Paie",
							tooltip: isAr ? "الرواتب والأجور وكشوف الأجر" : isEn ? "Payroll & Slips" : "Salaires & Paie",
							icon: /* @__PURE__ */ <DollarSign size={16} className="mr-1.5" />
						},
						{
							value: "history",
							label: isAr ? "الأرشيف" : isEn ? "History" : "Historique",
							tooltip: isAr ? "الأرشيف والسجلات الإدارية" : isEn ? "History & Audits" : "Historique & Audit",
							icon: /* @__PURE__ */ <History size={16} className="mr-1.5" />
						}
					]} />
</div>
{foundation.activeSubTab === "directory" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 sm:p-6 space-y-5 border border-[#E6DED6] dark:border-neutral-800/70 shadow-2xs">
<div className="flex flex-wrap items-center justify-between gap-3 w-full">
<div className="flex items-center gap-2.5 shrink-0">
<h2 className="text-[15.5px] sm:text-[16px] font-semibold tracking-[-0.018em] rtl:tracking-normal text-black dark:text-white">
{isAr ? "قائمة فريق العمل والمدربين" : isEn ? "Staff & Coaches Directory" : "Liste des collaborateurs"}
</h2>
<span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-white dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] text-black/75 dark:text-white/80 shadow-2xs tabular-nums">{foundation.filteredStaff.length}</span>
</div>
<div className="flex items-center gap-2.5 min-w-0 flex-wrap">
<Seek value={foundation.searchQuery} onChange={foundation.setSearchQuery} placeholder={isAr ? "بحث بالاسم، الهاتف، البادج..." : isEn ? "Search staff, phone, token..." : "Rechercher collaborateur..."} shutSize={40} openWidth={240} className="shrink-0 !rounded-xl" />
<div className="shrink-0">
<LiveSegmentedControl size="md" value={foundation.statusFilter} onValueChange={(val) => foundation.setStatusFilter(val as any)} options={quickStatusOptions} aria-label="Staff Status Filter" />
</div>
<button type="button" onClick={() => foundation.setIsPointageScannerOpen(true)} className="h-10 px-3.5 rounded-xl border flex items-center gap-2 text-xs font-semibold cursor-pointer transition-all shadow-2xs bg-white dark:bg-[#262422] border-[#E6DED6] dark:border-[#3A3734] text-black/75 dark:text-white hover:bg-[#F3EDE7]/60 dark:hover:bg-[#3A3734]" title={isAr ? "كشك البصمة / البادج السريع" : "Ouvrir Kiosk Pointage RFID / PIN"}>
<QrCode size={15} className="text-[#d4522f]" />
<span>{isAr ? "كشك الحضور" : "Pointer Kiosk"}</span>
</button>
</div>
<div className="flex items-center gap-2 shrink-0">
<LiveSegmentedControl size="md" options={[{
									value: "list",
									icon: /* @__PURE__ */ <List className="w-4 h-4" />,
									"aria-label": "List View"
								}, {
									value: "grid",
									icon: /* @__PURE__ */ <LayoutGrid className="w-4 h-4" />,
									"aria-label": "Grid View"
								}]} value={foundation.viewMode} onValueChange={(val) => foundation.setViewMode(val as any)} aria-label="View Switcher" />
<LiquidButton kind="export" size={40} tone="accent" labels={{
									idle: isAr ? "تصدير" : isEn ? "Export" : "Exporter",
									busy: isAr ? "جاري التصدير" : isEn ? "Exporting..." : "Exportation...",
									done: isAr ? "تم التصدير" : isEn ? "Exported" : "Exporté",
									error: isAr ? "فشل" : isEn ? "Failed" : "Échec"
								}} onPress={async () => {
									await new Promise((resolve) => setTimeout(resolve, 600));
									handleExportCSV();
								}} title={isAr ? "تصدير كملف CSV" : "Exporter en CSV"} aria-label={isAr ? "تصدير كملف CSV" : "Exporter en CSV"} className="shrink-0 !h-10 !max-h-10 !rounded-xl" style={{
									height: "40px",
									maxHeight: "40px",
									width: "148px"
								}} />
</div>
</div>
<UniversalDataCollection data={foundation.filteredStaff} columns={columns} keyExtractor={(item) => item.id} viewMode={foundation.viewMode} showViewToggle={false} selectedIds={foundation.selectedStaffIds} onSelectionChange={foundation.setSelectedStaffIds} pinnedIds={foundation.pinnedStaffIds} onPinToggle={(id) => {
						const key = typeof id === "string" ? id : id?.id;
						const next = new Set(foundation.pinnedStaffIds);
						if (next.has(key)) next.delete(key);
						else next.add(key);
						foundation.setPinnedStaffIds(next);
					}} onItemClick={(item) => foundation.handleOpenDrawer(item)} onBulkDelete={foundation.handleBulkDelete} bulkCustomActions={[
						{
							id: "punch_in",
							label: isAr ? "تسجيل حضور" : isEn ? "Punch In" : "Pointer Présents",
							onClick: foundation.handleBulkPointage
						},
						{
							id: "on_leave",
							label: isAr ? "تحويل لعطلة" : isEn ? "Set On Leave" : "Mettre en Congé",
							onClick: () => foundation.handleBulkStatusChange("on_leave")
						},
						{
							id: "frozen",
							label: isAr ? "تجميد مؤقت" : isEn ? "Suspend" : "Suspendre",
							onClick: () => foundation.handleBulkStatusChange("frozen")
						}
					]} />
</div>}
{foundation.activeSubTab === "attendance" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 sm:p-6 space-y-5 border border-[#E6DED6] dark:border-neutral-800/70 shadow-2xs">
<StaffAttendanceSubView staffList={foundation.facilityStaff} attendanceLogs={foundation.staffAttendanceLogs} onOpenKiosk={() => foundation.setIsPointageScannerOpen(true)} onPunchStaff={foundation.handlePunchPointage} onManualLog={foundation.logStaffAttendanceManual} language={language} />
</div>}
{foundation.activeSubTab === "payroll" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 sm:p-6 space-y-5 border border-[#E6DED6] dark:border-neutral-800/70 shadow-2xs">
<StaffPayrollSubView staffList={foundation.facilityStaff} payrollRuns={foundation.staffPayrollRuns} payrollSlips={foundation.staffPayrollSlips} salaryAdvances={foundation.staffSalaryAdvances} onGeneratePayroll={(month, year) => foundation.generateStaffPayrollRun(month, year, "membership_session")} onApprovePayroll={foundation.approveStaffPayrollRun} onMarkSlipPaid={foundation.markStaffPayrollSlipPaid} onCreateAdvance={foundation.createStaffSalaryAdvance} language={language} />
</div>}
{foundation.activeSubTab === "history" && /* @__PURE__ */ <div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 sm:p-6 space-y-5 border border-[#E6DED6] dark:border-neutral-800/70 shadow-2xs">
<StaffHistorySubView staffList={foundation.facilityStaff} payrollRuns={foundation.staffPayrollRuns} payrollSlips={foundation.staffPayrollSlips} attendanceLogs={foundation.staffAttendanceLogs} language={language} />
</div>}
<StaffInspectorDrawer staff={foundation.drawerStaff} isOpen={foundation.isDrawerOpen} onClose={foundation.handleCloseDrawer} onEdit={(member) => {
					foundation.handleCloseDrawer();
					foundation.handleOpenEdit(member);
				}} currentCategory="membership_session" />
<StaffModal isOpen={foundation.isModalOpen} onClose={foundation.handleCloseModal} staffToEdit={foundation.staffToEdit} currentCategory="membership_session" />
<QuickPointageModal isOpen={foundation.isPointageScannerOpen} onClose={() => foundation.setIsPointageScannerOpen(false)} staffList={foundation.facilityStaff} onPunch={foundation.handlePunchPointage} language={language} />
</div>;
};

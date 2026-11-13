import React, { useState, useMemo } from 'react';
import {
  Scale,
  CreditCard,
  Printer,
  CheckCircle2,
  ShieldCheck,
  DollarSign,
  Eye,
  Send,
  Lock,
  Unlock,
  Receipt,
  Building2,
  X,
  FileCheck,
  Plus,
  Coins,
  AlertTriangle,
  Key,
  BookOpen,
  ArrowRightLeft,
  FileSpreadsheet,
  Check,
  FileText,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useLegalData } from './legalData';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import {
  LegalMatter,
  EscrowAccount,
  SCFJournalEntry,
  CashReceipt,
  DailyCashClosure,
} from '../../../types';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';
import {
  canReleaseEscrow,
  validateAndBalanceSCFEntry,
  calculateArticle317Stamp,
} from '../../../utils/legalRules';
import { CashClosureModal } from '../../modals/CashClosureModal';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';



export const LegalTrustView: React.FC<any> = () => {
	const { language, activeLegalRole, isSyncing, networkMode, retryCloudSync } = useAtriumStore();
	const isAr = language === "ar";
	const { matters, updateMatter, escrowAccounts, updateEscrowAccount, scfEntries, addSCFEntry, cashReceipts, addCashReceipt, dailyClosure, updateDailyClosure } = useLegalData();
	const [selectedMatter, setSelectedMatter] = React.useState<any>(null);
	const [carpaTab, setCarpaTab] = React.useState("sequestre");
	const [selectedEscrow, setSelectedEscrow] = React.useState<any>(() => escrowAccounts[0] || null);
	const [escrowTab, setEscrowTab] = React.useState("double_lock");
	const [cadastralVolume, setCadastralVolume] = React.useState("");
	const [cadastralNumber, setCadastralNumber] = React.useState("");
	const [notaryPin, setNotaryPin] = React.useState("");
	const [releaseAmount, setReleaseAmount] = React.useState(0);
	const [selectedSCFEntry, setSelectedSCFEntry] = React.useState<any>(() => scfEntries[0] || null);
	const [scfJournalFilter, setScfJournalFilter] = React.useState("ALL");
	const [isSCFModalOpen, setIsSCFModalOpen] = React.useState(false);
	const [scfLibelle, setScfLibelle] = React.useState("");
	const [scfJournal, setScfJournal] = React.useState("VE");
	const [scfRefPiece, setScfRefPiece] = React.useState("");
	const [scfDebitAmount, setScfDebitAmount] = React.useState(1e5);
	const [scfTvaRate, setScfTvaRate] = React.useState(19);
	const [isClosureModalOpen, setIsClosureModalOpen] = React.useState(false);
	const [isNewReceiptModalOpen, setIsNewReceiptModalOpen] = React.useState(false);
	const [selectedReceipt, setSelectedReceipt] = React.useState<any>(() => cashReceipts[0] || null);
	const [receiptClientName, setReceiptClientName] = React.useState("");
	const [receiptMatterTitle, setReceiptMatterTitle] = React.useState("");
	const [receiptAmountHt, setReceiptAmountHt] = React.useState(5e4);
	const handleVerifyCadastre = () => {
		if (!selectedEscrow) return;
		if (!cadastralVolume.trim() || !cadastralNumber.trim()) {
			showToast(isAr ? "يرجى إدخال رقم المجلد ورقم الشهر العقاري" : "Veuillez saisir le volume et numéro de conservation", "error");
			return;
		}
		const updated = {
			...selectedEscrow,
			cadastralClearanceProof: {
				volume: cadastralVolume.trim(),
				number: cadastralNumber.trim(),
				recordedAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
			}
		};
		updateEscrowAccount(updated);
		setSelectedEscrow(updated);
		showToast(isAr ? `تم التحقق وتثبيت الإشهار العقاري بالمحافظة العقارية (${cadastralVolume} / ${cadastralNumber})` : `Publicité foncière validée : ${cadastralVolume} ${cadastralNumber} enregistrée avec succès`, "success");
	};
	const handleExecuteDoubleLockRelease = () => {
		if (!selectedEscrow) return;
		const amountToRelease = releaseAmount > 0 ? releaseAmount : selectedEscrow.currentBalanceDzd;
		const hasClearance = !!selectedEscrow.cadastralClearanceProof?.volume;
		const validation = canReleaseEscrow(selectedEscrow.currentBalanceDzd, amountToRelease, hasClearance, notaryPin, "2026");
		if (!validation.allowed) {
			showToast(validation.reason || (isAr ? "فشل فك الحراسة" : "Déblocage refusé"), "error");
			return;
		}
		const newTx = {
			id: `tx_${Date.now()}`,
			escrowAccountId: selectedEscrow.id,
			date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
			type: "seller_final_payout",
			amountDzd: amountToRelease,
			paymentMode: "virement_bancaire",
			bankReference: `VIR-NOT-${Math.floor(1e3 + Math.random() * 9e3)}`,
			authorizedByStaff: "Me Notaire Titulaire",
			notes: `Déblocage de séquestre post-publicité foncière (${selectedEscrow.cadastralClearanceProof?.volume})`
		};
		const newBalance = selectedEscrow.currentBalanceDzd - amountToRelease;
		const updated: any = {
			...selectedEscrow,
			currentBalanceDzd: newBalance,
			totalDisbursedDzd: selectedEscrow.totalDisbursedDzd + amountToRelease,
			isLocked: newBalance > 0,
			transactions: [newTx, ...selectedEscrow.transactions]
		};
		updateEscrowAccount(updated);
		setSelectedEscrow(updated);
		setNotaryPin("");
		showToast(isAr ? `تم فك القفل المزدوج بنجاح وتحويل ${formatMoney(amountToRelease, language)} إلى حساب المستفيد` : `Double-verrou validé : ${formatMoney(amountToRelease, language)} transférés avec ordre de virement`, "success");
	};
	const handleSaveSCFEntry = (e: any) => {
		e.preventDefault();
		if (!scfLibelle.trim()) {
			showToast(isAr ? "يرجى إدخال البيان" : "Veuillez saisir le libellé de l'écriture", "error");
			return;
		}
		const baseAmount = Number(scfDebitAmount) || 0;
		const tvaAmount = Math.round(baseAmount * (scfTvaRate / 100));
		const totalTtc = baseAmount + tvaAmount;
		const lines = [
			{
				id: `l_${Date.now()}_1`,
				accountNumber: "411000",
				accountLabel: "Clients - Créances sur prestations",
				debitDzd: totalTtc,
				creditDzd: 0
			},
			{
				id: `l_${Date.now()}_2`,
				accountNumber: "706000",
				accountLabel: "Prestations de services juridiques/audit",
				debitDzd: 0,
				creditDzd: baseAmount
			},
			{
				id: `l_${Date.now()}_3`,
				accountNumber: "445700",
				accountLabel: "TVA collectée sur prestations (19%)",
				debitDzd: 0,
				creditDzd: tvaAmount
			}
		];
		const balancing = validateAndBalanceSCFEntry(lines);
		if (!balancing.isBalanced) {
			showToast(balancing.error || "Erreur d'équilibrage", "error");
			return;
		}
		const newEntry: any = {
			id: `scf_${Date.now()}`,
			accountId: "acc_01",
			businessId: "biz_legal",
			branchId: "branch_legal_main",
			staffId: "staff_01",
			entryNumber: `EC-2026-${Math.floor(500 + Math.random() * 500)}`,
			journalCode: scfJournal,
			date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
			pieceJustificativeRef: scfRefPiece.trim() || `FAC-2026-${Math.floor(100 + Math.random() * 900)}`,
			libelle: scfLibelle.trim(),
			lines,
			totalDebitDzd: balancing.totalDebitDzd,
			totalCreditDzd: balancing.totalCreditDzd,
			isBalanced: true,
			status: "validated"
		};
		addSCFEntry(newEntry);
		setSelectedSCFEntry(newEntry);
		setIsSCFModalOpen(false);
		setScfLibelle("");
		showToast(isAr ? `تم تسجيل وترحيل القيد المحاسبي SCF رقم ${newEntry.entryNumber} بنجاح` : `Écriture SCF ${newEntry.entryNumber} équilibrée et validée au Grand Livre`, "success");
	};
	const handleSaveCashReceipt = (e: any) => {
		e.preventDefault();
		if (!receiptClientName.trim()) {
			showToast(isAr ? "يرجى إدخال اسم الموكل" : "Veuillez saisir le nom du client", "error");
			return;
		}
		const ht = Number(receiptAmountHt) || 0;
		const tva = Math.round(ht * .19);
		const ttc = ht + tva;
		const stamp = calculateArticle317Stamp(ttc, "especes");
		const netCollected = ttc + stamp;
		const newRc: any = {
			id: `cr_${Date.now()}`,
			accountId: "acc_01",
			businessId: "biz_legal",
			branchId: "branch_legal_main",
			staffId: "staff_01",
			receiptNumber: `RC-2026-${Math.floor(200 + Math.random() * 800)}`,
			clientName: receiptClientName.trim(),
			matterTitle: receiptMatterTitle.trim() || "Provision sur honoraires et diligences",
			totalHtDzd: ht,
			tvaDzd: tva,
			paymentMethod: "especes",
			timbreFiscalDzd: stamp,
			netCollectedDzd: netCollected,
			cashierName: "Samia Khelifa (Secrétaire)",
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		addCashReceipt(newRc);
		setSelectedReceipt(newRc);
		setIsNewReceiptModalOpen(false);
		setReceiptClientName("");
		setReceiptMatterTitle("");
		showToast(isAr ? `تم استلام ${formatMoney(newRc.netCollectedDzd, language)} نقداً وتوليد الوصل مع طابع المادة 317 (${formatMoney(newRc.timbreFiscalDzd, language)})` : `Encaissement espèces enregistré : ${formatMoney(newRc.netCollectedDzd, language)} (dont timbre Art. 317 : ${formatMoney(newRc.timbreFiscalDzd, language)})`, "success");
	};
	const totalTrust = matters.reduce((acc, m) => acc + (m.trustEscrowBalanceDzd || 0), 0);
	const totalRetainers = matters.reduce((acc, m) => acc + m.retainerAmountDzd, 0);
	const handleReleaseTrustFunds = (matter: any) => {
		if (!matter.trustEscrowBalanceDzd || matter.trustEscrowBalanceDzd === 0) {
			showToast(isAr ? "لا يوجد رصيد ودائع متبقي في هذا الحساب" : "Aucun fond séquestre à débloquer", "info");
			return;
		}
		const amount = matter.trustEscrowBalanceDzd;
		const updated = {
			...matter,
			trustEscrowBalanceDzd: 0
		};
		updateMatter(updated);
		if (selectedMatter?.id === matter.id) setSelectedMatter(updated);
		showToast(isAr ? `تم الإفراج عن الوديعة (${formatMoney(amount, language)}) وتحويلها لحساب الموكل` : `Déblocage des fonds séquestre (${formatMoney(amount, language)}) validé par CARPA`, "success");
	};
	const getCarpaActions = (m: any) => [
		{
			label: isAr ? "معاينة الحساب" : "Consulter Compte",
			icon: /* @__PURE__ */ <Eye size={14} />,
			onClick: () => setSelectedMatter(m)
		},
		{
			label: isAr ? "إفراج عن الوديعة" : "Débloquer Séquestre",
			icon: /* @__PURE__ */ <Unlock size={14} />,
			onClick: () => handleReleaseTrustFunds(m)
		},
		{
			label: isAr ? "كشف CARPA" : "Relevé CARPA",
			icon: /* @__PURE__ */ <Printer size={14} />,
			onClick: () => {
				showToast(isAr ? `طباعة كشف حساب الوديعة للقضية ${m.matterNumber}` : `Génération du relevé officiel CARPA (${m.matterNumber})`, "info");
			}
		}
	];
	const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
		isLoading: isSyncing || networkMode === "force_skeleton",
		hasCachedData: escrowAccounts.length > 0 || matters.length > 0
	});
	if (showSkeleton && (escrowAccounts.length === 0 && matters.length === 0 || networkMode === "force_skeleton")) return /* @__PURE__ */ <SkeletonCollectionScreen kpiCount={3} columns={[
			{
				width: "2.5*",
				minWidth: "180px"
			},
			{
				width: "1.5*",
				minWidth: "120px"
			},
			{
				width: "1.5*",
				minWidth: "120px"
			},
			{
				width: "1.2*",
				minWidth: "100px"
			},
			{
				width: "100px",
				minWidth: "80px"
			}
		]} viewMode="list" isOffline={isOffline} isTimedOut={isTimedOut} onRetry={retryCloudSync || retry} />;
	if (activeLegalRole === "notaire_titulaire") {
		const totalEscrowDeposited = escrowAccounts.reduce((acc, a) => acc + a.totalDepositedDzd, 0);
		const totalEscrowBalance = escrowAccounts.reduce((acc, a) => acc + a.currentBalanceDzd, 0);
		const lockedEscrowsCount = escrowAccounts.filter((a) => a.isLocked).length;
		return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold shadow-xs"><Lock size={22} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[32px] sm:text-[40px] rtl:text-[26px] rtl:sm:text-[32px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">
{isAr ? "حساب الحراسة والودائع العقارية (Séquestre Notarial)" : "Compte Séquestre Notarial & Consignations"}
</h1>
<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#d4522f]/15 text-[#d4522f]">Double-Verrou Obligatoire</span>
</div>
</div>
</div>
<div className="flex items-center gap-2">
<AtriumButton variant="outline" onClick={() => {
								showToast(isAr ? "طباعة كشف الودائع العقارية" : "Relevé des comptes séquestres imprimé", "info");
								window.print();
							}} icon={<Printer size={14} />}>{isAr ? "طباعة السجل" : "Imprimer Registre"}</AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div>
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">
{isAr ? "مؤشرات حسابات الودائع والحراسة العقارية" : "Fonds Mandants & Prix de Vente Séquestrés"}
</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{isAr ? "إجمالي الودائع المودعة" : "Total Fonds Consignés"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(totalEscrowDeposited, language)}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5 font-medium">
{escrowAccounts.length}
{" "}
{isAr ? "حسابات مودعة" : "comptes sous mandat"}
</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{isAr ? "حسابات بانتظار الإشهار العقاري" : "En Attente Publicité Foncière"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{lockedEscrowsCount}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5 font-medium">{isAr ? "معلقة إلى حين صدور رقم المجلد" : "Bloqués (Conservation Foncière)"}</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-white/80">{isAr ? "الرصيد المحمي تحت الحراسة" : "Solde Séquestre Actuel"}</span>
<span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">Protégé Trésor</span>
</div>
<div>
<div className="text-2xl font-black text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(totalEscrowBalance, language)}</div>
<p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
<CheckCircle2 size={11} />
{isAr ? "حساب مصرفي مخصص مستقل" : "Sous-compte Trésor séparé"}
</p>
</div>
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="flex flex-col lg:flex-row gap-6 items-start">
<div className="flex-1 min-w-0 w-full">
<UniversalDataCollection title={isAr ? "سجل حسابات الحراسة العقارية" : "Registre des Comptes Séquestres Immobiliers"} subtitle={isAr ? "متابعة مبالغ الشراء المحجوزة لحين نقل الملكية" : "Comptes affectés aux ventes immobilières et mainlevées"} items={escrowAccounts} keyExtractor={(a) => a.id} searchPlaceholder={isAr ? "بحث برقم الملف، المشتري أو البائع..." : "Rechercher dossier, acheteur, vendeur, conservation..."} searchFilter={(a, q) => a.matterReference.toLowerCase().includes(q.toLowerCase()) || a.clientName.toLowerCase().includes(q.toLowerCase()) || a.beneficiaryName.toLowerCase().includes(q.toLowerCase())} onSelectRow={(a) => setSelectedEscrow(a)} customActions={(a) => [{
									label: isAr ? "فك القفل المزدوج" : "Double-Verrou",
									icon: /* @__PURE__ */ <Unlock size={14} />,
									onClick: () => {
										setSelectedEscrow(a);
										setEscrowTab("double_lock");
									}
								}, {
									label: isAr ? "أمر تحويل بنكي" : "Ordre Virement",
									icon: /* @__PURE__ */ <Printer size={14} />,
									onClick: () => {
										setSelectedEscrow(a);
										setEscrowTab("virement");
									}
								}]} columns={[
									{
										id: "matterReference",
										header: isAr ? "رقم الملف" : "Réf Dossier",
										width: "130px",
										sortable: true,
										renderCell: (a: any) => /* @__PURE__ */ <div className="font-mono font-bold text-xs text-[#d4522f]">{a.matterReference}</div>
									},
									{
										id: "parties",
										header: isAr ? "المشتري ➔ البائع المستفيد" : "Acquéreur ➔ Vendeur",
										renderCell: (a: any) => /* @__PURE__ */ <div className="text-xs">
<span className="font-bold text-black dark:text-white block">{a.clientName}</span>
<span className="text-[11px] text-black/55 dark:text-white/55">
{"➔ "}
{a.beneficiaryName}
</span>
</div>
									},
									{
										id: "balance",
										header: isAr ? "الرصيد المحجوز" : "Solde Séquestre",
										width: "150px",
										sortable: true,
										renderCell: (a: any) => /* @__PURE__ */ <div className="font-mono text-xs font-bold text-[#d4522f]">{formatMoney(a.currentBalanceDzd, language)}</div>
									},
									{
										id: "cadastre",
										header: isAr ? "المحافظة العقارية" : "Publicité Foncière",
										width: "160px",
										renderCell: (a: any) => a.cadastralClearanceProof?.volume ? /* @__PURE__ */ <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 inline-flex items-center gap-1">
<CheckCircle2 size={11} />
{a.cadastralClearanceProof.volume}
{" "}
{a.cadastralClearanceProof.number}
</span> : /* @__PURE__ */ <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 inline-flex items-center gap-1">
<AlertTriangle size={11} />
{isAr ? "في انتظار الإشهار" : "Attente Conservation"}
</span>
									},
									{
										id: "status",
										header: isAr ? "حالة القفل" : "Verrou",
										width: "120px",
										renderCell: (a: any) => /* @__PURE__ */ <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${a.isLocked ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300" : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"}`}>
{a.isLocked ? /* @__PURE__ */ <Lock size={10} /> : /* @__PURE__ */ <Unlock size={10} />}
{a.isLocked ? isAr ? "مقفل 🔒" : "Verrouillé" : isAr ? "محرر 🔓" : "Libéré"}
</span>
									}
								]} />
</div>
{selectedEscrow && /* @__PURE__ */ <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
<div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold"><Lock size={16} /></div>
<div>
<h3 className="font-bold text-xs text-black dark:text-white font-mono">{selectedEscrow.matterReference}</h3>
<p className="text-[10px] text-black/55 dark:text-white/55 truncate max-w-[210px]">{selectedEscrow.clientName}</p>
</div>
</div>
<button onClick={() => setSelectedEscrow(null)} className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-black/55 dark:text-white/55 transition-colors"><X size={15} /></button>
</div>
<div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 pt-2 gap-2 text-xs">
<button onClick={() => setEscrowTab("double_lock")} className={`pb-2 font-semibold border-b-2 transition-colors px-2 ${escrowTab === "double_lock" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80"}`}>{isAr ? "القفل المزدوج" : "Double-Verrou"}</button>
<button onClick={() => setEscrowTab("transactions")} className={`pb-2 font-semibold border-b-2 transition-colors px-2 ${escrowTab === "transactions" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80"}`}>{isAr ? "المعاملات" : "Historique"}</button>
<button onClick={() => setEscrowTab("virement")} className={`pb-2 font-semibold border-b-2 transition-colors px-2 ${escrowTab === "virement" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80"}`}>{isAr ? "أمر التحويل" : "Ordre Virement"}</button>
</div>
<div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
{escrowTab === "double_lock" && /* @__PURE__ */ <div className="space-y-4">
<div className="p-4 bg-[#1F1D1B] rounded-xl text-white space-y-2">
<div className="flex items-center justify-between text-white/80 text-[11px]">
<span>Solde Sous Séquestre Notarial</span>
<span className="bg-[#3D2817] text-[#FB923C] text-[10px] font-bold px-2 py-0.5 rounded-full">{selectedEscrow.isLocked ? "Verrouillé 🔒" : "Prêt / Libéré 🔓"}</span>
</div>
<div className="text-2xl font-black text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{formatMoney(selectedEscrow.currentBalanceDzd, language)}</div>
<p className="text-[10px] text-white/75">
{"Bénéficiaire désigné : "}
{selectedEscrow.beneficiaryName}
</p>
</div>
<div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
<div className="flex items-center justify-between">
<span className="text-xs font-bold text-black dark:text-white flex items-center gap-1.5">
<Building2 size={14} className="text-[#d4522f]" />
{isAr ? "الشرط الأول: الإشهار بالمحافظة العقارية" : "Verrou 1 : Publicité Foncière"}
</span>
{selectedEscrow.cadastralClearanceProof?.volume ? /* @__PURE__ */ <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
<CheckCircle2 size={12} />
{isAr ? "تم التحقق" : "Conforme"}
</span> : /* @__PURE__ */ <span className="text-[10px] font-bold text-amber-600">En attente</span>}
</div>
{selectedEscrow.cadastralClearanceProof?.volume ? /* @__PURE__ */ <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 space-y-1">
<div className="font-mono text-xs font-bold">
{"Volume : "}
{selectedEscrow.cadastralClearanceProof.volume}
{" · Numéro : "}
{selectedEscrow.cadastralClearanceProof.number}
</div>
<div className="text-[10px]">
{"Date d'enregistrement : "}
{selectedEscrow.cadastralClearanceProof.recordedAt}
</div>
</div> : /* @__PURE__ */ <div className="space-y-2">
<div className="grid grid-cols-2 gap-2">
<LabelInput label={isAr ? "رقم المجلد *" : "Volume *"} placeholder="Vol. 418" value={cadastralVolume} onChange={(e) => setCadastralVolume(e.target.value)} />
<LabelInput label={isAr ? "رقم الشهر *" : "Numéro *"} placeholder="N° 22" value={cadastralNumber} onChange={(e) => setCadastralNumber(e.target.value)} />
</div>
<button onClick={handleVerifyCadastre} className="w-full py-1.5 rounded-lg bg-[#d4522f] text-white font-bold text-xs hover:bg-[#b06a4e] transition-colors">{isAr ? "تأكيد الإشهار العقاري" : "Valider la Publicité"}</button>
</div>}
</div>
<div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
<span className="text-xs font-bold text-black dark:text-white flex items-center gap-1.5">
<Key size={14} className="text-[#d4522f]" />
{isAr ? "الشرط الثاني: رمز الأمان للموثق Titulaire" : "Verrou 2 : Code PIN Notaire Titulaire"}
</span>
<div className="space-y-2">
<LabelInput label={isAr ? "رمز الأمان PIN (الافتراضي: 2026)" : "Code PIN Notaire (Défaut: 2026)"} type="password" placeholder="••••" value={notaryPin} onChange={(e) => setNotaryPin(e.target.value)} />
<LabelInput label={isAr ? "مبلغ الإفراج (DZD) - اتركه فارغاً للكل" : "Montant à Débloquer (DZD)"} type="number" placeholder={selectedEscrow.currentBalanceDzd.toString()} value={releaseAmount || ""} onChange={(e) => setReleaseAmount(Number(e.target.value))} />
</div>
<button onClick={handleExecuteDoubleLockRelease} disabled={selectedEscrow.currentBalanceDzd <= 0} className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-sm cursor-pointer">
<Unlock size={14} />
{isAr ? "فك القفل المزدوج وإصدار أمر التحويل" : "Débloquer & Émettre Virement"}
</button>
</div>
</div>}
{escrowTab === "transactions" && /* @__PURE__ */ <div className="space-y-3">
<span className="text-[11px] font-bold text-black/55 dark:text-white/55 uppercase tracking-wider block">Mouvements Bancaires & Trésor</span>
{selectedEscrow.transactions.map((tx: any) => /* @__PURE__ */ <div key={tx.id} className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1 bg-white dark:bg-neutral-900">
<div className="flex items-center justify-between font-mono">
<span className="text-[10px] text-black/55 dark:text-white/55">{tx.date}</span>
<span className={`text-xs font-bold ${tx.type === "deposit_received" ? "text-emerald-600" : "text-blue-600"}`}>
{tx.type === "deposit_received" ? "+" : "-"}
{" "}
{formatMoney(tx.amountDzd, language)}
</span>
</div>
<p className="text-xs text-black dark:text-white font-medium">{tx.notes}</p>
<div className="text-[10px] text-black/55 dark:text-white/55 flex items-center justify-between">
<span>
{"Mode : "}
{tx.paymentMode}
</span>
<span className="font-mono">{tx.bankReference}</span>
</div>
</div>)}
</div>}
{escrowTab === "virement" && /* @__PURE__ */ <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-3 text-xs">
<div className="text-center pb-2 border-b border-neutral-200 dark:border-neutral-800">
<span className="font-bold uppercase tracking-wider text-[#d4522f] block">Étude Notariale · Ordre de Virement Séquestre</span>
<span className="text-[10px] text-black/55 dark:text-white/55">République Algérienne Démocratique et Populaire</span>
</div>
<div className="space-y-1.5 text-black/70 dark:text-white/75">
<div>
<strong>Donneur d'ordre :</strong>
{" Maître Notaire Titulaire"}
</div>
<div>
<strong>Compte débité :</strong>
{" Compte Séquestre Trésor BNA N° 0010 0987 6543"}
</div>
<div>
<strong>Bénéficiaire :</strong>
{" "}
{selectedEscrow.beneficiaryName}
</div>
<div>
<strong>Montant :</strong>
{" "}
<span className="font-mono font-bold text-black dark:text-white">{formatMoney(selectedEscrow.currentBalanceDzd, language)}</span>
</div>
<div>
<strong>Motif :</strong>
{" Vente immobilière dossier "}
{selectedEscrow.matterReference}
</div>
</div>
<button onClick={() => {
														showToast(isAr ? "جاري طباعة أمر التحويل الرسمي" : "Ordre de virement officiel imprimé", "info");
														window.print();
													}} className="w-full mt-2 py-2 rounded-lg bg-[#d4522f] text-white font-bold text-xs flex items-center justify-center gap-1.5">
<Printer size={13} />
{isAr ? "طباعة أمر التحويل" : "Imprimer le Virement"}
</button>
</div>}
</div>
</div>}
</div>
</div>
</div>;
	}
	if (activeLegalRole === "expert_comptable") {
		const totalDebitAll = scfEntries.reduce((acc, e) => acc + e.totalDebitDzd, 0);
		const totalCreditAll = scfEntries.reduce((acc, e) => acc + e.totalCreditDzd, 0);
		const isLedgerBalanced = Math.abs(totalDebitAll - totalCreditAll) === 0;
		const filteredEntries = scfJournalFilter === "ALL" ? scfEntries : scfEntries.filter((e) => e.journalCode === scfJournalFilter);
		return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold shadow-xs"><Scale size={22} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[32px] sm:text-[40px] rtl:text-[26px] rtl:sm:text-[32px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">
{isAr ? "دفتر الأستاذ وميزان المراجعة SCF (القانون 07-11)" : "Grand Livre & Journaux SCF (Loi 07-11)"}
</h1>
<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Partie Double Équilibrée</span>
</div>
</div>
</div>
<div className="flex items-center gap-2">
<AtriumButton variant="primary" onClick={() => setIsSCFModalOpen(true)} icon={<Plus size={14} />}>{isAr ? "قيد محاسبي جديد" : "Nouvelle Écriture SCF"}</AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div>
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">
{isAr ? "المؤشرات المحاسبية وميزان المراجعة" : "Balance des Écritures & Conformité SCF"}
</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{isAr ? "إجمالي حركات المدين (Débit)" : "Total Mouvements Débit"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(totalDebitAll, language)}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5 font-medium">
{scfEntries.length}
{" "}
{isAr ? "قيد مسجل" : "écritures passées"}
</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{isAr ? "إجمالي حركات الدائن (Crédit)" : "Total Mouvements Crédit"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(totalCreditAll, language)}</div>
<p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">{isLedgerBalanced ? "✓ Équilibre Parfait (Δ = 0)" : "Déséquilibre détecté"}</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-white/80">{isAr ? "توازن النظام المحاسبي" : "Statut Grand Livre"}</span>
<span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">SCF 07-11</span>
</div>
<div>
<div className="text-2xl font-black text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">100% Conforme</div>
<p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
<CheckCircle2 size={11} />
{isAr ? "قيود مدققة ومطابقة" : "Zéro écart de clôture"}
</p>
</div>
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="flex items-center justify-between">
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">
{isAr ? "سجل القيود المحاسبية اليومية" : "Journal Général des Écritures Comptables"}
</h2>
<div className="flex items-center gap-1.5 p-1 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200 dark:border-neutral-700 shadow-2xs">
{[
								{ code: "ALL", tip: isAr ? "جميع دفاتر اليومية" : language === "fr" ? "Tous les journaux comptables" : "All accounting journals" },
								{ code: "VE", tip: isAr ? "يومية المبيعات والأتعاب" : language === "fr" ? "Journal des Ventes / Honoraires (VE)" : "Sales & Fees Journal (VE)" },
								{ code: "CA", tip: isAr ? "يومية الصندوق النقدي" : language === "fr" ? "Journal de Caisse (CA)" : "Cash Journal (CA)" },
								{ code: "BQ", tip: isAr ? "يومية البنك وحساب CARPA" : language === "fr" ? "Journal de Banque / CARPA (BQ)" : "Bank & Escrow Journal (BQ)" },
								{ code: "OD", tip: isAr ? "العمليات المتنوعة والتسوية" : language === "fr" ? "Opérations Diverses (OD)" : "Miscellaneous Operations (OD)" }
							].map(({ code, tip }) => /* @__PURE__ */ <button key={code} onClick={() => setScfJournalFilter(code)} title={tip} className="px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all" style={{
									backgroundColor: scfJournalFilter === code ? "#FCEEE8" : "transparent",
									color: scfJournalFilter === code ? "var(--color-accent)" : "#71717A"
								}}>{code === "ALL" ? isAr ? "الكل" : language === "fr" ? "Tous" : "All" : code}</button>)}
</div>
</div>
<div className="flex flex-col lg:flex-row gap-6 items-start">
<div className="flex-1 min-w-0 w-full">
<UniversalDataCollection title={isAr ? "القيود المحاسبية" : "Écritures SCF"} subtitle={isAr ? "تسجيل القيود وفق مدونة الحسابات الوطنية" : "Plan comptable général & justificatifs"} items={filteredEntries} keyExtractor={(e) => e.id} searchPlaceholder={isAr ? "بحث برقم القيد، البيان، المرجع..." : "Rechercher N° écriture, libellé, pièce..."} searchFilter={(e, q) => e.entryNumber.toLowerCase().includes(q.toLowerCase()) || e.libelle.toLowerCase().includes(q.toLowerCase()) || e.pieceJustificativeRef.toLowerCase().includes(q.toLowerCase())} onSelectRow={(e) => setSelectedSCFEntry(e)} columns={[
									{
										id: "entryNumber",
										header: isAr ? "رقم القيد" : "N° Écriture",
										width: "130px",
										sortable: true,
										renderCell: (e: any) => /* @__PURE__ */ <div className="font-mono font-bold text-xs text-[#d4522f]">{e.entryNumber}</div>
									},
									{
										id: "journal",
										header: "Jrn",
										width: "60px",
										renderCell: (e: any) => /* @__PURE__ */ <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75">{e.journalCode}</span>
									},
									{
										id: "libelle",
										header: isAr ? "البيان والمرجع" : "Libellé & Justificatif",
										renderCell: (e: any) => /* @__PURE__ */ <div>
<span className="font-bold text-xs text-black dark:text-white block">{e.libelle}</span>
<span className="text-[11px] text-black/55 dark:text-white/55 font-mono">
{"Réf: "}
{e.pieceJustificativeRef}
{" · "}
{e.date}
</span>
</div>
									},
									{
										id: "debit",
										header: isAr ? "المدين" : "Débit",
										width: "130px",
										sortable: true,
										renderCell: (e: any) => /* @__PURE__ */ <span className="font-mono text-xs font-bold text-black dark:text-white">{formatMoney(e.totalDebitDzd, language)}</span>
									},
									{
										id: "credit",
										header: isAr ? "الدائن" : "Crédit",
										width: "130px",
										sortable: true,
										renderCell: (e: any) => /* @__PURE__ */ <span className="font-mono text-xs font-bold text-black dark:text-white">{formatMoney(e.totalCreditDzd, language)}</span>
									},
									{
										id: "status",
										header: isAr ? "التوازن" : "Équilibre",
										width: "100px",
										renderCell: (e: any) => /* @__PURE__ */ <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center gap-1">
<CheckCircle2 size={10} />
Équilibré
</span>
									}
								]} />
</div>
{selectedSCFEntry && /* @__PURE__ */ <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
<div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold"><Scale size={16} /></div>
<div>
<h3 className="font-bold text-xs text-black dark:text-white font-mono">{selectedSCFEntry.entryNumber}</h3>
<p className="text-[10px] text-black/55 dark:text-white/55">
{"Journal "}
{selectedSCFEntry.journalCode}
{" · "}
{selectedSCFEntry.date}
</p>
</div>
</div>
<button onClick={() => setSelectedSCFEntry(null)} className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-black/55 dark:text-white/55 transition-colors"><X size={15} /></button>
</div>
<div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
<div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1.5">
<span className="text-[10px] uppercase font-bold text-black/55 dark:text-white/55 block">Objet & Pièce Justificative</span>
<p className="font-semibold text-black dark:text-white">{selectedSCFEntry.libelle}</p>
<p className="text-[11px] text-black/55 dark:text-white/55 font-mono">
{"Pièce: "}
{selectedSCFEntry.pieceJustificativeRef}
</p>
</div>
<div className="space-y-2">
<span className="text-[10px] uppercase font-bold text-black/55 dark:text-white/55 block">Ventilation des Lignes Comptables</span>
{selectedSCFEntry.lines.map((l: any) => /* @__PURE__ */ <div key={l.id} className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-1">
<div className="flex items-center justify-between">
<span className="font-mono font-bold text-xs text-[#d4522f]">{l.accountNumber}</span>
<div className="font-mono text-xs font-bold">
{l.debitDzd > 0 ? /* @__PURE__ */ <span className="text-black dark:text-white">
{"D: "}
{formatMoney(l.debitDzd, language)}
</span> : /* @__PURE__ */ <span className="text-black/55 dark:text-white/55">
{"C: "}
{formatMoney(l.creditDzd, language)}
</span>}
</div>
</div>
<p className="text-[11px] text-black/70 dark:text-white/75 truncate">{l.accountLabel}</p>
</div>)}
</div>
<div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-center font-bold font-mono">
{"Total Débit = Total Crédit = "}
{formatMoney(selectedSCFEntry.totalDebitDzd, language)}
</div>
</div>
</div>}
</div>
</div>
{isSCFModalOpen && /* @__PURE__ */ <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
<div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
<div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
<div className="flex items-center gap-2">
<Scale size={20} className="text-[#d4522f]" />
<h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">{isAr ? "تسجيل قيد محاسبي مزدوج (SCF)" : "Saisie d'une Écriture Comptable SCF"}</h2>
</div>
<button onClick={() => setIsSCFModalOpen(false)} className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"><X size={18} /></button>
</div>
<form onSubmit={handleSaveSCFEntry} className="space-y-3 text-xs">
<div className="grid grid-cols-2 gap-3">
<LabelSelect label={isAr ? "دفتر اليومية" : "Code Journal"} value={scfJournal} onChange={(e) => setScfJournal(e.target.value)} options={[
											{
												value: "VE",
												label: "VE - Ventes"
											},
											{
												value: "CA",
												label: "CA - Caisse"
											},
											{
												value: "BQ",
												label: "BQ - Banque"
											},
											{
												value: "OD",
												label: "OD - Opérations Diverses"
											}
										]} />
<LabelInput label={isAr ? "مرجع الوثيقة" : "Réf Pièce Justificative"} placeholder="FAC-2026-092" value={scfRefPiece} onChange={(e) => setScfRefPiece(e.target.value)} />
</div>
<LabelInput label={isAr ? "البيان المحاسبي *" : "Libellé de l'écriture *"} placeholder="Ex: Facturation honoraires audit légal" value={scfLibelle} onChange={(e) => setScfLibelle(e.target.value)} required />
<div className="grid grid-cols-2 gap-3">
<LabelInput label={isAr ? "المبلغ الصافي الخاضع (HT) *" : "Montant HT (Prestation) *"} type="number" value={scfDebitAmount} onChange={(e) => setScfDebitAmount(Number(e.target.value))} required />
<LabelSelect label={isAr ? "نسبة الرسم على القيمة المضافة TVA" : "Taux TVA"} value={scfTvaRate.toString()} onChange={(e) => setScfTvaRate(Number(e.target.value))} options={[
											{
												value: "19",
												label: "19% (Taux Normal)"
											},
											{
												value: "9",
												label: "9% (Taux Réduit)"
											},
											{
												value: "0",
												label: "0% (Exonéré)"
											}
										]} />
</div>
<div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl space-y-1 font-mono text-[11px]">
<div className="flex justify-between">
<span>Compte 706000 (Crédit HT):</span>
<span className="font-bold">{formatMoney(scfDebitAmount, language)}</span>
</div>
<div className="flex justify-between">
<span>
{"Compte 445700 (TVA "}
{scfTvaRate}
%):
</span>
<span className="font-bold">{formatMoney(Math.round(scfDebitAmount * (scfTvaRate / 100)), language)}</span>
</div>
<div className="flex justify-between border-t border-neutral-200 dark:border-neutral-700 pt-1 font-bold text-[#d4522f]">
<span>Compte 411000 (Débit TTC):</span>
<span>
{formatMoney(scfDebitAmount + Math.round(scfDebitAmount * (scfTvaRate / 100)), language)}
</span>
</div>
</div>
<div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
<AtriumButton variant="ghost" size="sm" onClick={() => setIsSCFModalOpen(false)}>{isAr ? "إلغاء" : "Annuler"}</AtriumButton>
<AtriumButton variant="primary" size="sm" type="submit">{isAr ? "تسجيل القيد" : "Enregistrer au Grand Livre"}</AtriumButton>
</div>
</form>
</div>
</div>}
</div>;
	}
	if (activeLegalRole === "secretaire_caisse") return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold shadow-xs"><CreditCard size={22} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[32px] sm:text-[40px] rtl:text-[26px] rtl:sm:text-[32px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">
{isAr ? "الصندوق وطابع المادة 317 ومحضر الإغلاق" : "Caisse Journalière & Timbre Art. 317 (Arrêté)"}
</h1>
<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Espèces & Droit de Timbre</span>
</div>
</div>
</div>
<div className="flex items-center gap-2">
<AtriumButton variant="outline" onClick={() => setIsClosureModalOpen(true)} icon={<ShieldCheck size={14} />}>{isAr ? "محضر إغلاق الصندوق" : "Arrêté de Caisse (PV)"}</AtriumButton>
<AtriumButton variant="primary" onClick={() => setIsNewReceiptModalOpen(true)} icon={<Plus size={14} />}>{isAr ? "قبض نقدي جديد" : "Encaisser Espèces"}</AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div>
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">
{isAr ? "حالة الصندوق والسيولة النقدية" : "Situation de Caisse & Droits de Timbre"}
</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{isAr ? "الرصيد النظري للصندوق" : "Solde Théorique en Caisse"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(dailyClosure.theoreticalCashDzd || 0, language)}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5 font-medium">
{cashReceipts.length}
{" "}
{isAr ? "وصولات مقبوضة" : "quittances émises"}
</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{isAr ? "طابع المادة 317 المحصل" : "Timbre Fiscal Art. 317 Collecté"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(dailyClosure.totalTimbreAccruedDzd || 0, language)}</div>
<p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">{isAr ? "مستحق الدفع لمفتشية الضرائب" : "À reverser à la recette des impôts"}</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-white/80">{isAr ? "مطابقة الجرد الفعلي" : "Arrêté Physique"}</span>
<span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">{dailyClosure.status === "balanced" ? "Conforme" : "Écart"}</span>
</div>
<div>
<div className="text-2xl font-black text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(dailyClosure.actualPhysicalCashCountedDzd || 0, language)}</div>
<p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
<CheckCircle2 size={11} />
{isAr ? "مطابق تماماً بدون أي فارق" : "Écart = 0 DZD (Validé)"}
</p>
</div>
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="flex flex-col lg:flex-row gap-6 items-start">
<div className="flex-1 min-w-0 w-full">
<UniversalDataCollection title={isAr ? "سجل وصولات القبض النقدية" : "Quittances de Caisse & Timbre Fiscal"} subtitle={isAr ? "الوصولات المسلمة للزبائن مع تفصيل الطابع الجبائي" : "Reçus de paiement en espèces selon Art. 317"} items={cashReceipts} keyExtractor={(r) => r.id} searchPlaceholder={isAr ? "بحث برقم الوصل، الموكل أو الملف..." : "Rechercher N° quittance, client, affaire..."} searchFilter={(r, q) => r.receiptNumber.toLowerCase().includes(q.toLowerCase()) || r.clientName.toLowerCase().includes(q.toLowerCase()) || r.matterTitle.toLowerCase().includes(q.toLowerCase())} onSelectRow={(r) => setSelectedReceipt(r)} columns={[
								{
									id: "receiptNumber",
									header: isAr ? "رقم الوصل" : "N° Quittance",
									width: "130px",
									sortable: true,
									renderCell: (r: any) => /* @__PURE__ */ <div className="font-mono font-bold text-xs text-[#d4522f]">{r.receiptNumber}</div>
								},
								{
									id: "client",
									header: isAr ? "الموكل والملف" : "Client & Prestation",
									renderCell: (r: any) => /* @__PURE__ */ <div>
<span className="font-bold text-xs text-black dark:text-white block">{r.clientName}</span>
<span className="text-[11px] text-black/55 dark:text-white/55">{r.matterTitle}</span>
</div>
								},
								{
									id: "totalHt",
									header: "HT",
									width: "110px",
									renderCell: (r: any) => /* @__PURE__ */ <span className="font-mono text-xs text-black/70 dark:text-white/75">{formatMoney(r.totalHtDzd, language)}</span>
								},
								{
									id: "timbre",
									header: isAr ? "طابع م 317" : "Timbre Art. 317",
									width: "120px",
									renderCell: (r: any) => /* @__PURE__ */ <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
+
{formatMoney(r.timbreFiscalDzd, language)}
</span>
								},
								{
									id: "net",
									header: isAr ? "الصافي المقبوض" : "Net Encaissé",
									width: "130px",
									sortable: true,
									renderCell: (r: any) => /* @__PURE__ */ <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(r.netCollectedDzd, language)}</span>
								}
							]} />
</div>
{selectedReceipt && /* @__PURE__ */ <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
<div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold"><Receipt size={16} /></div>
<div>
<h3 className="font-bold text-xs text-black dark:text-white font-mono">{selectedReceipt.receiptNumber}</h3>
<p className="text-[10px] text-black/55 dark:text-white/55">{selectedReceipt.clientName}</p>
</div>
</div>
<button onClick={() => setSelectedReceipt(null)} className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-black/55 dark:text-white/55 transition-colors"><X size={15} /></button>
</div>
<div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
<div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-3">
<div className="text-center pb-2 border-b border-neutral-200 dark:border-neutral-800">
<span className="font-bold text-sm text-[#d4522f] block">وصل تسليم نقدية رسمي</span>
<span className="text-[10px] text-black/55 dark:text-white/55">Quittance de Versement en Espèces</span>
</div>
<div className="space-y-2 text-xs">
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Reçu de :</span>
<span className="font-bold text-black dark:text-white">{selectedReceipt.clientName}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Motif :</span>
<span className="font-medium text-black dark:text-white">{selectedReceipt.matterTitle}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">Montant HT :</span>
<span className="font-mono">{formatMoney(selectedReceipt.totalHtDzd, language)}</span>
</div>
<div className="flex justify-between">
<span className="text-black/55 dark:text-white/55">TVA 19% :</span>
<span className="font-mono">{formatMoney(selectedReceipt.tvaDzd, language)}</span>
</div>
<div className="flex justify-between text-amber-600 font-bold">
<span>Droit de Timbre (Art. 317) :</span>
<span className="font-mono">
+
{formatMoney(selectedReceipt.timbreFiscalDzd, language)}
</span>
</div>
<div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800 font-bold text-sm text-emerald-600">
<span>Net Encaissé :</span>
<span className="font-mono">{formatMoney(selectedReceipt.netCollectedDzd, language)}</span>
</div>
</div>
<div className="pt-2 text-[10px] text-black/55 dark:text-white/55 border-t border-neutral-100 dark:border-neutral-800 flex justify-between">
<span>
{"Caissier : "}
{selectedReceipt.cashierName}
</span>
<span className="font-mono">{selectedReceipt.createdAt.slice(0, 10)}</span>
</div>
</div>
<button onClick={() => {
									showToast(isAr ? "طباعة الوصل الرسمي للزبون" : "Quittance officielle imprimée", "success");
									window.print();
								}} className="w-full py-2.5 rounded-xl bg-[#d4522f] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm">
<Printer size={14} />
{isAr ? "طباعة وصل الموكل" : "Imprimer Quittance Client"}
</button>
</div>
</div>}
</div>
</div>
{isNewReceiptModalOpen && /* @__PURE__ */ <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
<div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
<div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
<div className="flex items-center gap-2">
<CreditCard size={20} className="text-[#d4522f]" />
<h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
{isAr ? "قبض مبلغ نقدي مع طابع المادة 317" : "Encaissement Espèces & Timbre Art. 317"}
</h2>
</div>
<button onClick={() => setIsNewReceiptModalOpen(false)} className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"><X size={18} /></button>
</div>
<form onSubmit={handleSaveCashReceipt} className="space-y-3 text-xs">
<LabelInput label={isAr ? "اسم الموكل / الدافع *" : "Nom du Client / Payeur *"} placeholder="Ex: Hadj Amine Mansouri" value={receiptClientName} onChange={(e) => setReceiptClientName(e.target.value)} required />
<LabelInput label={isAr ? "موضوع الدفعة / القضية" : "Objet du Versement"} placeholder="Ex: Provision sur honoraires dossier 26/01482" value={receiptMatterTitle} onChange={(e) => setReceiptMatterTitle(e.target.value)} />
<LabelInput label={isAr ? "المبلغ الصافي الخاضع (HT) بالدينار *" : "Montant HT (DZD) *"} type="number" value={receiptAmountHt} onChange={(e) => setReceiptAmountHt(Number(e.target.value))} required />
{(() => {
								const ht = Number(receiptAmountHt) || 0;
								const tva = Math.round(ht * .19);
								const ttc = ht + tva;
								const stamp = calculateArticle317Stamp(ttc, "especes");
								const netCollected = ttc + stamp;
								return /* @__PURE__ */ <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl space-y-1 font-mono text-[11px]">
<div className="flex justify-between">
<span>Montant HT:</span>
<span>{formatMoney(ht, language)}</span>
</div>
<div className="flex justify-between">
<span>TVA (19%):</span>
<span>{formatMoney(tva, language)}</span>
</div>
<div className="flex justify-between text-amber-600 font-bold">
<span>Timbre Fiscal Progressif (Art. 317):</span>
<span>
+
{formatMoney(stamp, language)}
</span>
</div>
<div className="flex justify-between border-t border-neutral-200 dark:border-neutral-700 pt-1 font-bold text-sm text-emerald-600">
<span>Total Net à Encaisser en Espèces:</span>
<span>{formatMoney(netCollected, language)}</span>
</div>
<p className="text-[10px] text-black/55 dark:text-white/55 font-sans mt-1">
{"Droit de timbre gradué (Art. 317 du Code du Timbre) : Exonéré < 500 DA, 20-200 DA, puis 1% plafonné à 2 500 DA."}
</p>
</div>;
							})()}
<div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
<AtriumButton variant="ghost" size="sm" onClick={() => setIsNewReceiptModalOpen(false)}>{isAr ? "إلغاء" : "Annuler"}</AtriumButton>
<AtriumButton variant="primary" size="sm" type="submit">{isAr ? "توليد الوصل والقبض" : "Valider l'Encaissement"}</AtriumButton>
</div>
</form>
</div>
</div>}
<CashClosureModal isOpen={isClosureModalOpen} onClose={() => setIsClosureModalOpen(false)} closure={dailyClosure} cashReceipts={cashReceipts} onSaveClosure={(cl) => {
					updateDailyClosure(cl);
					setIsClosureModalOpen(false);
				}} />
</div>;
	return /* @__PURE__ */ <div className="space-y-6 animate-in fade-in duration-200">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold shadow-xs"><CreditCard size={22} /></div>
<div>
<div className="flex items-center gap-2">
<h1 className="text-[32px] sm:text-[40px] rtl:text-[26px] rtl:sm:text-[32px] font-extrabold uppercase leading-none rtl:leading-tight tracking-[0.01em] text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans rtl:normal-case rtl:tracking-normal">
{isAr ? "حساب الحراسة والودائع والأتعاب (Séquestre CARPA)" : "Compte Séquestre CARPA & Honoraires Avocat"}
</h1>
<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">Ordre des Avocats</span>
</div>
</div>
</div>
<div className="flex items-center gap-2">
<AtriumButton variant="outline" onClick={() => {
							showToast(isAr ? "طباعة كشف حساب الودائع CARPA" : "Relevé séquestre CARPA imprimé", "info");
							window.print();
						}} icon={<Printer size={14} />}>{isAr ? "كشف CARPA" : "Relevé CARPA"}</AtriumButton>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div>
<h2 className="text-[13.5px] font-semibold text-black dark:text-white">
{isAr ? "إدارة أموال الموكلين والودائع القضائية" : "Comptabilité des Fonds Mandants & Diligences"}
</h2>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{isAr ? "أتعاب الدفاع والخدمات" : "Honoraires & Diligences"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-black dark:text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(totalRetainers, language)}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5 font-medium">
{matters.length}
{" "}
{isAr ? "قضية محصلة" : "affaires conventionnées"}
</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
<span className="text-[11px] font-medium text-black/55 dark:text-white/75">{isAr ? "قضايا مودعة تحت الحراسة" : "Dossiers Sous Séquestre"}</span>
<div>
<div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{matters.filter((m) => (m.trustEscrowBalanceDzd || 0) > 0).length}</div>
<p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5 font-medium">{isAr ? "خاضعة لإشراف نقابة المحامين" : "Contrôlés sous égide déontologique"}</p>
</div>
</div>
<div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
<div className="flex items-center justify-between">
<span className="text-[11px] font-medium text-white/80">{isAr ? "إجمالي الودائع (Séquestre)" : "Fonds Séquestre Protégés"}</span>
<span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">Séquestre CARPA</span>
</div>
<div>
<div className="text-2xl font-black text-white tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans">{formatMoney(totalTrust, language)}</div>
<p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
<CheckCircle2 size={11} />
{matters.length}
{" "}
{isAr ? "حساب مصفى" : "comptes audités"}
</p>
</div>
</div>
</div>
</div>
<div className="bg-[#F3EDE7] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#E6DED6] dark:border-neutral-800/60 shadow-2xs space-y-4">
<div className="flex flex-col lg:flex-row gap-6 items-start">
<div className="flex-1 min-w-0 w-full">
<UniversalDataCollection title={isAr ? "سجل الحسابات والودائع" : "Relevé des Comptes Séquestres CARPA & Honoraires"} subtitle={isAr ? "متابعة الودائع وتصفية الأموال" : "Comptes affectés et décomptes déontologiques du barreau"} items={matters} keyExtractor={(m) => m.id} searchPlaceholder={isAr ? "بحث برقم القضية، الموكل، الموضوع..." : "Rechercher dossier, client, affaire, CARPA..."} searchFilter={(m, query) => m.title.toLowerCase().includes(query.toLowerCase()) || m.clientName.toLowerCase().includes(query.toLowerCase()) || m.matterNumber.toLowerCase().includes(query.toLowerCase()) || (m.assignedLawyer || "").toLowerCase().includes(query.toLowerCase())} onSelectRow={(m) => setSelectedMatter(m)} customActions={(m) => getCarpaActions(m)} columns={[
								{
									id: "matterNumber",
									header: isAr ? "رقم القضية" : "N° Dossier",
									width: "130px",
									sortable: true,
									renderCell: (m: any) => /* @__PURE__ */ <div className="font-mono font-bold text-xs text-[#d4522f]">{m.matterNumber}</div>
								},
								{
									id: "matter",
									header: isAr ? "الموضوع" : "Affaire & Objet",
									renderCell: (m: any) => /* @__PURE__ */ <div>
<span className="font-bold text-xs text-black dark:text-white block">{m.title}</span>
<span className="text-[11px] text-black/55 dark:text-white/55">
{m.category}
{" · "}
{m.courtJurisdiction || "Tribunal"}
</span>
</div>
								},
								{
									id: "client",
									header: isAr ? "الموكل" : "Client Mandant",
									width: "180px",
									renderCell: (m: any) => /* @__PURE__ */ <div className="text-xs">
<span className="font-semibold text-black dark:text-white block truncate">{m.clientName}</span>
<span className="text-[10px] text-black/55 dark:text-white/55 font-mono">{m.clientPhone || "0550 00 00 00"}</span>
</div>
								},
								{
									id: "retainer",
									header: isAr ? "أتعاب المكتب" : "Honoraires",
									width: "140px",
									sortable: true,
									renderCell: (m: any) => /* @__PURE__ */ <span className="font-mono text-xs font-bold text-black dark:text-white">{formatMoney(m.retainerAmountDzd, language)}</span>
								},
								{
									id: "trust",
									header: isAr ? "رصيد Séquestre" : "Séquestre CARPA",
									width: "160px",
									sortable: true,
									renderCell: (m: any) => /* @__PURE__ */ <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{formatMoney(m.trustEscrowBalanceDzd || 0, language)}</div>
								},
								{
									id: "status",
									header: isAr ? "الرقابة" : "Audit CARPA",
									width: "130px",
									renderCell: () => /* @__PURE__ */ <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 inline-flex items-center gap-1">
<ShieldCheck size={11} />
{isAr ? "مطابق ومحمي" : "Conforme"}
</span>
								}
							]} />
</div>
{selectedMatter && /* @__PURE__ */ <div className="w-full lg:w-[390px] shrink-0 bg-white dark:bg-neutral-850 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 shadow-lg flex flex-col h-[740px] overflow-hidden animate-in slide-in-from-right-4 duration-200">
<div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
<div className="flex items-center gap-2.5">
<div className="w-8 h-8 rounded-lg bg-[#d4522f]/15 text-[#d4522f] flex items-center justify-center font-bold"><CreditCard size={16} /></div>
<div>
<h3 className="font-bold text-xs text-black dark:text-white font-mono">{selectedMatter.matterNumber}</h3>
<p className="text-[10px] text-black/55 dark:text-white/55 truncate max-w-[210px]">{selectedMatter.clientName}</p>
</div>
</div>
<button onClick={() => setSelectedMatter(null)} className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-black/55 dark:text-white/55 transition-colors"><X size={15} /></button>
</div>
<div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 pt-2 gap-2 text-xs">
<button onClick={() => setCarpaTab("sequestre")} className={`pb-2 font-semibold border-b-2 transition-colors px-2 ${carpaTab === "sequestre" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80"}`}>{isAr ? "الودائع Séquestre" : "Séquestre"}</button>
<button onClick={() => setCarpaTab("honoraires")} className={`pb-2 font-semibold border-b-2 transition-colors px-2 ${carpaTab === "honoraires" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80"}`}>{isAr ? "الأتعاب والمصاريف" : "Honoraires"}</button>
<button onClick={() => setCarpaTab("deontologie")} className={`pb-2 font-semibold border-b-2 transition-colors px-2 ${carpaTab === "deontologie" ? "border-[#d4522f] text-[#d4522f]" : "border-transparent text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80"}`}>{isAr ? "المطابقة النقابية" : "CARPA & Éthique"}</button>
</div>
<div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
{carpaTab === "sequestre" && /* @__PURE__ */ <div className="space-y-4">
<div className="p-4 bg-[#1F1D1B] rounded-xl text-white space-y-2 shadow-sm">
<div className="flex items-center justify-between text-white/80 text-[11px]">
<span>Fonds Mandant Sous Séquestre</span>
<span className="bg-[#3D2817] text-[#FB923C] text-[10px] font-bold px-2 py-0.5 rounded-full">Inaliénable</span>
</div>
<div className="text-2xl font-black tracking-tight text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">{formatMoney(selectedMatter.trustEscrowBalanceDzd || 0, language)}</div>
<p className="text-[10px] text-white/75">Montant bloqué sur sous-compte CARPA jusqu'à décision judiciaire exécutoire.</p>
</div>
<div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
<div>
<span className="font-semibold block text-black dark:text-white">Déblocage de Séquestre</span>
<span className="text-[10px] text-black/55 dark:text-white/55">Sur présentation du jugement définitif</span>
</div>
<button onClick={() => handleReleaseTrustFunds(selectedMatter)} disabled={!selectedMatter.trustEscrowBalanceDzd || selectedMatter.trustEscrowBalanceDzd === 0} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#d4522f] hover:bg-[#b06a4e] text-white disabled:opacity-50 transition-colors">Débloquer</button>
</div>
</div>}
{carpaTab === "honoraires" && /* @__PURE__ */ <div className="space-y-4">
<div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
<span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">Décompte d'Honoraires & Diligences</span>
<div className="flex items-center justify-between">
<span className="text-black/55 dark:text-white/55">Convention d'honoraires:</span>
<span className="font-mono font-bold text-black dark:text-white">{formatMoney(selectedMatter.retainerAmountDzd, language)}</span>
</div>
<div className="flex items-center justify-between">
<span className="text-black/55 dark:text-white/55">Droits de plaidoirie & timbres:</span>
<span className="font-mono text-black/70 dark:text-white/75">12 000 DZD</span>
</div>
</div>
</div>}
{carpaTab === "deontologie" && /* @__PURE__ */ <div className="space-y-4">
<div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
<span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">Conformité Déontologique Ordre des Avocats</span>
<div className="space-y-1.5 text-black/70 dark:text-white/75">
<div className="flex items-center gap-2">
<FileCheck size={14} className="text-emerald-500" />
<span>Séparation hermétique des comptes de cabinet</span>
</div>
<div className="flex items-center gap-2">
<FileCheck size={14} className="text-emerald-500" />
<span>Contrôle périodique du Conseil de l'Ordre</span>
</div>
</div>
</div>
</div>}
</div>
</div>}
</div>
</div>
</div>;
};

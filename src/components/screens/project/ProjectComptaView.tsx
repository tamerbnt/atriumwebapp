import React, { useState } from 'react';
import { useAtriumStore } from '../../../services/store';
import { PMCcpSlip, PMExpense, PMEquipmentStock } from '../../../types/index';
import { CcpSlipModal } from './CcpSlipModal';
import {
  CreditCard,
  FileSpreadsheet,
  Receipt,
  Boxes,
  CheckCircle,
  AlertCircle,
  Printer,
  Eye,
  Lock,
  Download,
  Filter,
  Search,
  Sparkles,
  QrCode,
  ShieldCheck,
  RefreshCw,
  Calendar,
  Check,
  Tag,
  History,
  ArrowRight,
  ExternalLink,
  DollarSign,
} from 'lucide-react';
import { Seek } from '../../ui/Seek';
import { useTranslation } from '../../../utils/useTranslation';

interface ProjectComptaViewProps {
  initialTab?: 'payroll' | 'ccp' | 'expenses' | 'stock';
}

export const ProjectComptaView: React.FC<ProjectComptaViewProps> = ({ initialTab }) => {
  const { t, language, isRtl } = useTranslation();
  const {
    pmPayrollBatches,
    pmCcpSlips,
    pmExpenses,
    pmEquipmentStock,
    generatePmCcpSlipsForBatch,
    markPmCcpSlipPrinted,
    updatePmEquipmentStatus,
    activePmSubScreen,
    setActivePmSubScreen,
    showToast,
  } = useAtriumStore();

  const activeTab: 'payroll' | 'ccp' | 'expenses' | 'stock' =
    activePmSubScreen === 'ccp' || initialTab === 'ccp'
      ? 'ccp'
      : activePmSubScreen === 'expenses' || initialTab === 'expenses'
      ? 'expenses'
      : activePmSubScreen === 'stock' || initialTab === 'stock'
      ? 'stock'
      : 'payroll';

  const setActiveTab = (tab: 'payroll' | 'ccp' | 'expenses' | 'stock') => {
    setActivePmSubScreen(tab);
  };

  const [selectedSlip, setSelectedSlip] = useState<PMCcpSlip | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<PMExpense | null>(pmExpenses[0] || null);
  const [selectedStockAssetId, setSelectedStockAssetId] = useState<string>(
    pmEquipmentStock[0]?.id || 'eq_00'
  );
  const [stockCategoryFilter, setStockCategoryFilter] = useState<string>('all');
  const [batchGeneratedSuccess, setBatchGeneratedSuccess] = useState(false);

  // Active selected animator slip for Slide 10 right-hand preview
  const defaultSlip: PMCcpSlip = pmCcpSlips[0] || {
    id: 'slip_demo',
    tenantId: 'acc_01',
    facilityId: 'branch_agency_main',
    batchId: 'batch_01',
    talentId: 'talent_01',
    beneficiaryName: 'Meriem Boukhalfa',
    ccpNumber: '33 18 81',
    ccpKey: '50',
    wilayaName: 'Alger (16)',
    amountDzd: 18000,
    amountInWordsFr: 'Dix-huit mille dinars algériens et zéro centime',
    amountInWordsAr: 'ثمانية عشر ألف دينار جزائري ولا سنتيم',
    transactionReference: 'Paie MIS-142 - Animation GMS Bab Ezzouar',
    isPrinted: false,
    createdAt: new Date().toISOString(),
  };

  const [activePreviewSlip, setActivePreviewSlip] = useState<PMCcpSlip>(defaultSlip);

  // Mock list of individual animators for Slide 10 "Paies — Juillet" Ledger
  const [individualPayrollRows, setIndividualPayrollRows] = useState([
    {
      id: 'pay_row_01',
      animatorName: 'Meriem Boukhalfa',
      initials: 'MB',
      missionTitle: 'MIS-142 · Animation Carrefour Bab Ezzouar',
      daysWorked: 5,
      amountDzd: 18000,
      ccpNumber: '33 18 81',
      ccpKey: '50',
      wilaya: 'Alger',
      status: 'approved_dg', // Validée DG
    },
    {
      id: 'pay_row_02',
      animatorName: 'Yasmine Belkacem',
      initials: 'YB',
      missionTitle: 'MIS-142 · Animation Carrefour Bab Ezzouar',
      daysWorked: 4,
      amountDzd: 14400,
      ccpNumber: '00 12 34 56',
      ccpKey: '45',
      wilaya: 'Alger',
      status: 'approved_dg', // Validée DG
    },
    {
      id: 'pay_row_03',
      animatorName: 'Ryad Sofiane Boumedienne',
      initials: 'RB',
      missionTitle: 'MIS-142 · Animation Carrefour Bab Ezzouar',
      daysWorked: 5,
      amountDzd: 22500,
      ccpNumber: '00 98 76 54',
      ccpKey: '12',
      wilaya: 'Alger',
      status: 'approved_dg', // Validée DG
    },
    {
      id: 'pay_row_04',
      animatorName: 'Amina Saadi',
      initials: 'AS',
      missionTitle: 'MIS-143 · Roadshow Ooredoo Oran',
      daysWorked: 3,
      amountDzd: 10800,
      ccpNumber: '00 44 55 66',
      ccpKey: '78',
      wilaya: 'Oran',
      status: 'pending_dg', // En attente
    },
    {
      id: 'pay_row_05',
      animatorName: 'Karim Mansouri',
      initials: 'KM',
      missionTitle: 'MIS-143 · Roadshow Ooredoo Oran',
      daysWorked: 3,
      amountDzd: 12000,
      ccpNumber: '00 77 88 99',
      ccpKey: '33',
      wilaya: 'Oran',
      status: 'pending_dg', // En attente
    },
  ]);

  const [payrollSearch, setPayrollSearch] = useState('');

  const filteredPayrollRows = individualPayrollRows.filter((r) =>
    !payrollSearch.trim() ||
    r.animatorName.toLowerCase().includes(payrollSearch.toLowerCase()) ||
    r.missionTitle.toLowerCase().includes(payrollSearch.toLowerCase()) ||
    r.ccpNumber.includes(payrollSearch)
  );

  const validatedDgCount = individualPayrollRows.filter((r) => r.status === 'approved_dg').length;
  const pendingBatches = pmPayrollBatches.filter((b) => b.status === 'approved_by_direction');

  // Currently selected stock asset for Slide 11
  const selectedStockAsset =
    pmEquipmentStock.find((eq) => eq.id === selectedStockAssetId) ||
    pmEquipmentStock[0];

  const handleGenerateAllCcpBatch = () => {
    // Generate slips for all approved batches
    pendingBatches.forEach((batch) => {
      generatePmCcpSlipsForBatch(batch.id);
    });
    setBatchGeneratedSuccess(true);
    if (showToast) {
      showToast({
        title: t('toast_ccp_generated'),
        message: t('pm_compta_batch_success'),
        type: 'success',
      });
    }
    setTimeout(() => setBatchGeneratedSuccess(false), 3500);
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C4785A]">
              {t('pm_role_compta_badge')}
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-xs text-zinc-500">{t('pm_role_compta_sub')}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {t('pm_compta_title')}
          </h1>
        </div>

        {/* Global Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print?.()}
            className="px-3.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            {t('common_print')} (Audit)
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-1 overflow-x-auto">
        {[
          { id: 'payroll', label: t('pm_compta_tab_payroll'), icon: DollarSign },
          { id: 'ccp', label: t('pm_compta_tab_ccp'), icon: CreditCard, count: pmCcpSlips.length },
          { id: 'expenses', label: t('pm_compta_tab_expenses'), icon: Receipt, count: pmExpenses.length },
          { id: 'stock', label: t('pm_compta_tab_stock'), icon: Boxes, count: pmEquipmentStock.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2.5 px-4 border-b-2 font-medium text-xs whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#C4785A] text-[#C4785A]'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Automated Payroll Hub matching Slide 10 */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          {/* Top KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                {t('pm_compta_kpi_active_period')}
              </span>
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#C4785A]" />
                Juillet 2026
              </span>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                {t('pm_compta_kpi_approved_dg')}
              </span>
              <span className="text-xl font-mono font-bold text-emerald-600 flex items-center gap-2 tabular-nums">
                {validatedDgCount}
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-sans font-bold">
                  {t('pm_compta_status_validated_dg')}
                </span>
              </span>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                {t('pm_compta_kpi_pending_dg')}
              </span>
              <span className="text-xl font-mono font-bold text-amber-600 flex items-center gap-2 tabular-nums">
                {individualPayrollRows.length - validatedDgCount}
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-sans font-bold">
                  {t('pm_compta_status_pending_dg')}
                </span>
              </span>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                {t('pm_compta_kpi_net_payroll')}
              </span>
              <span className="text-xl font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                {individualPayrollRows.reduce((acc, r) => acc + r.amountDzd, 0).toLocaleString()} DA
              </span>
            </div>
          </div>

          {/* Slide 10 Main Split Grid: Left Paies Ledger & Right Embedded SFP 01 Check */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Paies - Juillet & Big Red Button */}
            <div className="lg:col-span-7 space-y-4">
              {/* Header Card */}
              <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {t('pm_compta_audit_title')}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {t('pm_compta_audit_sub')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Seek
                      value={payrollSearch}
                      onChange={setPayrollSearch}
                      placeholder={t('common_search')}
                      openWidth={260}
                      shutSize={36}
                    />
                    <span className="text-xs font-mono font-semibold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-xl shrink-0">
                      {filteredPayrollRows.length}
                    </span>
                  </div>
                </div>

                {/* Big Red Button matching Slide 10 */}
                <button
                  type="button"
                  onClick={handleGenerateAllCcpBatch}
                  className="w-full py-3.5 px-4 bg-[#DC2626] hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t('pm_compta_btn_generate_batch', { count: validatedDgCount })}
                </button>

                {batchGeneratedSuccess && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    {t('pm_compta_batch_success')}
                  </div>
                )}

                {/* Table of Individual Animateurs (Slide 10 Layout) */}
                <div className="overflow-x-auto pt-1">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3 rounded-l-lg">{t('pm_compta_table_animator')}</th>
                        <th className="p-3">{t('pm_compta_table_mission')}</th>
                        <th className="p-3 text-center">{t('pm_compta_table_days')}</th>
                        <th className="p-3 text-right">{t('pm_compta_table_amount')}</th>
                        <th className="p-3 text-right rounded-r-lg">{t('pm_compta_table_status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {filteredPayrollRows.map((row) => {
                        const isSelected = activePreviewSlip.beneficiaryName === row.animatorName;
                        return (
                          <tr
                            key={row.id}
                            onClick={() => {
                              setActivePreviewSlip({
                                id: row.id,
                                tenantId: 'acc_01',
                                facilityId: 'branch_agency_main',
                                batchId: 'batch_01',
                                talentId: 'talent_01',
                                beneficiaryName: row.animatorName,
                                ccpNumber: row.ccpNumber,
                                ccpKey: row.ccpKey,
                                wilayaName: `${row.wilaya} (16)`,
                                amountDzd: row.amountDzd,
                                amountInWordsFr:
                                  row.amountDzd === 18000
                                    ? 'Dix-huit mille dinars algériens et zéro centime'
                                    : row.amountDzd === 14400
                                    ? 'Quatorze mille quatre cents dinars algériens et zéro centime'
                                    : row.amountDzd === 22500
                                    ? 'Vingt-deux mille cinq cents dinars algériens et zéro centime'
                                    : row.amountDzd === 10800
                                    ? 'Dix mille huit cents dinars algériens et zéro centime'
                                    : 'Douze mille dinars algériens et zéro centime',
                                amountInWordsAr:
                                  row.amountDzd === 18000
                                    ? 'ثمانية عشر ألف دينار جزائري ولا سنتيم'
                                    : 'أربعة عشر ألف وأربعمائة دينار جزائري ولا سنتيم',
                                transactionReference: `Paie ${row.missionTitle}`,
                                isPrinted: false,
                                createdAt: new Date().toISOString(),
                              });
                            }}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-red-50/70 dark:bg-red-950/20 font-semibold'
                                : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                            }`}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-[10px] text-zinc-700 dark:text-zinc-200">
                                  {row.initials}
                                </div>
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                  {row.animatorName}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-zinc-600 dark:text-zinc-400 max-w-[180px] truncate">
                              {row.missionTitle}
                            </td>
                            <td className="p-3 text-center font-mono font-medium">
                              {row.daysWorked}j
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                              {row.amountDzd.toLocaleString()} DA
                            </td>
                            <td className="p-3 text-right">
                              {row.status === 'approved_dg' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  <Check className="w-3 h-3" />
                                  {t('pm_compta_status_validated_dg')}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                  <Lock className="w-3 h-3" />
                                  {t('pm_compta_status_pending_dg')}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Lots de Paie Validés (Summary Cards) */}
              <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  {t('pm_compta_batches_transmitted')}
                </span>
                <div className="space-y-2">
                  {pmPayrollBatches.map((batch) => (
                    <div
                      key={batch.id}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {batch.batchNumber}
                        </span>
                        <span className="text-zinc-400 mx-1.5">·</span>
                        <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                          {batch.missionCode} — {batch.projectTitle}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {batch.totalAmountDzd.toLocaleString()} DA
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {t('pm_compta_status_validated_dg')} ✓
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Authentic Algérie Poste SFP 01 Postal Check Preview */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs sticky top-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#C4785A]" />
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {t('pm_compta_voucher_preview_header')}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {t('pm_compta_voucher_official_badge')}
                  </span>
                </div>

                {/* SFP 01 Postal Check Canvas */}
                <div className="bg-[#FFFBEB] dark:bg-amber-950/20 border-2 border-dashed border-[#FCD34D] dark:border-amber-800 rounded-2xl p-5 text-zinc-900 dark:text-zinc-100 space-y-3.5 shadow-sm">
                  {/* Header Republic & Ministry */}
                  <div className="flex justify-between items-start pb-2.5 border-b border-amber-300 dark:border-amber-900/60">
                    <div>
                      <p className="font-bold text-[9px] uppercase tracking-wider text-amber-900 dark:text-amber-300">
                        {t('pm_compta_republic_title')}
                      </p>
                      <p className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200">
                        {t('pm_compta_ministry_title')}
                      </p>
                      <p className="text-[9px] font-semibold text-[#C4785A] mt-0.5">
                        {t('pm_compta_ptt_ops')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block border border-amber-400 bg-white dark:bg-zinc-900 px-2.5 py-0.5 font-mono font-bold text-xs rounded text-amber-900 dark:text-amber-200 shadow-2xs">
                        SFP 01
                      </span>
                    </div>
                  </div>

                  {/* Account and Amount Box */}
                  <div className="p-3 bg-white dark:bg-zinc-900/90 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 font-semibold text-[10px] uppercase">
                        {t('pm_compta_account_key_label')}
                      </span>
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                        {activePreviewSlip.ccpNumber} — Clé {activePreviewSlip.ccpKey}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
                      <span className="text-zinc-500 font-semibold text-[10px] uppercase">
                        {t('pm_compta_amount_wire_label')}
                      </span>
                      <span className="font-mono font-extrabold text-base text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {activePreviewSlip.amountDzd.toLocaleString()} DA
                      </span>
                    </div>
                  </div>

                  {/* Beneficiary Details */}
                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] uppercase font-semibold text-zinc-500 block">
                      {t('pm_compta_beneficiary_label')}
                    </span>
                    <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      {activePreviewSlip.beneficiaryName}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {t('pm_compta_wilaya_label')} {activePreviewSlip.wilayaName}
                    </p>
                  </div>

                  {/* Legal Transcription in Words */}
                  <div className="p-2.5 rounded-lg bg-amber-100/60 dark:bg-amber-900/30 border border-amber-200/80 dark:border-amber-900/50 space-y-1">
                    <span className="text-[9px] uppercase font-bold text-amber-900 dark:text-amber-300 block">
                      {t('pm_compta_amount_in_words_label')}
                    </span>
                    <p className="font-serif italic text-xs text-zinc-800 dark:text-zinc-200 leading-snug">
                      « {activePreviewSlip.amountInWordsFr} »
                    </p>
                    {activePreviewSlip.amountInWordsAr && (
                      <p className="text-[11px] text-zinc-700 dark:text-zinc-300 font-arabic text-right leading-relaxed pt-0.5">
                        « {activePreviewSlip.amountInWordsAr} »
                      </p>
                    )}
                  </div>

                  {/* Postal Stamps & Motif */}
                  <div className="pt-2 border-t border-amber-300 dark:border-amber-900/60 flex items-center justify-between text-[10px] text-zinc-500">
                    <div>
                      <span className="block font-semibold">{t('pm_compta_purpose_label')}</span>
                      <span>{activePreviewSlip.transactionReference}</span>
                    </div>
                    <div className="w-16 h-12 rounded border border-dashed border-amber-400 flex items-center justify-center text-[8px] text-amber-800 dark:text-amber-300 text-center font-bold uppercase">
                      {t('pm_compta_stamp_ptt')}
                    </div>
                  </div>
                </div>

                {/* SFP 01 Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSlip(activePreviewSlip);
                    }}
                    className="flex-1 py-2.5 px-3 bg-[#C4785A] hover:bg-[#b3684a] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    {t('pm_compta_btn_print_sfp01')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (showToast) {
                        showToast({
                          title: t('common_export'),
                          message: `${activePreviewSlip.beneficiaryName} — SFP 01`,
                          type: 'success',
                        });
                      }
                    }}
                    className="p-2.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title={t('common_export')}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 1-Click Algerian Post (CCP SFP 01) Generator */}
      {activeTab === 'ccp' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t('pm_compta_slips_issued_title')}
              </h3>
              <p className="text-xs text-zinc-500">
                {t('pm_compta_slips_issued_sub')}
              </p>
            </div>
            <button
              onClick={() => window.print?.()}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              {t('pm_compta_btn_print_all_slips')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pmCcpSlips.map((slip) => (
              <div
                key={slip.id}
                className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3 flex flex-col justify-between hover:border-zinc-300 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{slip.beneficiaryName}</span>
                    <span className="font-mono text-zinc-400">{slip.wilayaName}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs space-y-1">
                    <div className="flex justify-between font-mono">
                      <span className="text-zinc-500">{t('pm_rh_col_ccp')} :</span>
                      <strong className="text-zinc-900 dark:text-zinc-100">
                        {slip.ccpNumber} · {t('pm_rh_col_key', { key: slip.ccpKey })}
                      </strong>
                    </div>
                    <div className="flex justify-between font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      <span>{t('common_amount')} :</span>
                      <span>{slip.amountDzd.toLocaleString()} DA</span>
                    </div>
                  </div>

                  <p className="font-serif italic text-[11px] text-zinc-500 line-clamp-2">
                    « {slip.amountInWordsFr} »
                  </p>
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400">
                    {slip.isPrinted ? t('pm_compta_status_printed') : t('pm_compta_status_ready_counter')}
                  </span>
                  <button
                    onClick={() => setSelectedSlip(slip)}
                    className="px-3 py-1 text-xs font-semibold text-[#C4785A] hover:bg-[#C4785A]/10 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {t('pm_compta_btn_view_sfp01')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Field Expense Audit & Dual-Pane Receipt Scanner */}
      {activeTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Expenses Ledger (2 Cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t('pm_compta_expense_journal_title')}
                </h3>
                <p className="text-xs text-zinc-500">
                  {t('pm_compta_expense_journal_sub')}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {pmExpenses.map((exp) => (
                <div
                  key={exp.id}
                  onClick={() => setSelectedExpense(exp)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-4 ${
                    selectedExpense?.id === exp.id
                      ? 'border-[#C4785A] bg-[#C4785A]/5 shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                        {exp.title}
                      </span>
                      {exp.hasFiscalInvoice && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          {t('pm_compta_fiscal_invoice_badge')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {t('pm_compta_declared_by', { project: exp.projectTitle, user: exp.declaredByUserName })}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100 tabular-nums block">
                      {exp.amountDzd.toLocaleString()} DA
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        exp.status === 'approved_by_direction'
                          ? 'text-emerald-600'
                          : exp.status === 'rejected'
                          ? 'text-red-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {exp.status === 'approved_by_direction' ? t('pm_compta_status_validated_dg') : t('pm_compta_status_pending_dg')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Receipt Scanner Viewer (1 Col) */}
          <div className="space-y-4">
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-6 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#C4785A]" />
                {t('pm_compta_scanner_title')}
              </h3>

              {selectedExpense?.receiptPhotoUrl ? (
                <div className="space-y-3">
                  <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 p-2 flex justify-center">
                    <img
                      src={selectedExpense.receiptPhotoUrl}
                      alt="Reçu"
                      className="max-h-80 object-contain rounded"
                    />
                  </div>
                  <div className="text-xs space-y-1 text-zinc-600 dark:text-zinc-400">
                    <p>{t('common_name')}: <strong>{selectedExpense.title}</strong></p>
                    <p>{t('common_amount')}: <strong className="font-mono">{selectedExpense.amountDzd.toLocaleString()} DA</strong></p>
                    {selectedExpense.fiscalNif && (
                      <p className="font-mono text-[11px] text-emerald-600">
                        {t('pm_compta_nif_recorded')} {selectedExpense.fiscalNif}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 text-center py-12">
                  {t('pm_compta_scanner_select')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Equipment & Indirect Stock Lifecycle Tracker (Slide 11 Exact Match) */}
      {activeTab === 'stock' && (
        <div className="space-y-6">
          {/* Header & Filter Capsules */}
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-[#C4785A]" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {t('pm_compta_stock_title')}
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {t('pm_compta_stock_sub')}
              </p>
            </div>

            {/* Filter Capsules */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { id: 'all', label: t('pm_compta_filter_all_stock', { count: pmEquipmentStock.length }) },
                { id: 'indirect', label: t('pm_compta_filter_indirect') },
                { id: 'in_stock', label: t('pm_compta_filter_in_stock') },
                { id: 'deployed', label: t('pm_compta_filter_deployed') },
              ].map((capsule) => (
                <button
                  key={capsule.id}
                  onClick={() => setStockCategoryFilter(capsule.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    stockCategoryFilter === capsule.id
                      ? 'bg-[#C4785A] text-white shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                  }`}
                >
                  {capsule.label}
                </button>
              ))}
            </div>
          </div>

          {/* Slide 11 Main Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 6 Cols: Assets List */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span>{t('pm_compta_stock_registered')}</span>
                <span>{t('pm_compta_stock_items_count', { count: pmEquipmentStock.length })}</span>
              </div>

              <div className="space-y-2.5">
                {pmEquipmentStock
                  .filter((eq) => {
                    if (stockCategoryFilter === 'indirect') return eq.assetCode.startsWith('NCH-A');
                    if (stockCategoryFilter === 'in_stock') return eq.currentStatus === 'in_stock';
                    if (stockCategoryFilter === 'deployed') return eq.currentStatus === 'deployed_on_mission';
                    return true;
                  })
                  .map((eq) => {
                    const isSelected = selectedStockAsset?.id === eq.id;
                    const isIndirect = eq.assetCode.startsWith('NCH-A');
                    return (
                      <div
                        key={eq.id}
                        onClick={() => setSelectedStockAssetId(eq.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                          isSelected
                            ? 'border-[#C4785A] bg-[#C4785A]/5 shadow-sm ring-1 ring-[#C4785A]/30'
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-[#C4785A]">
                                {eq.assetCode}
                              </span>
                              {isIndirect && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                  {t('pm_compta_badge_indirect')}
                                </span>
                              )}
                            </div>
                            <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mt-1">
                              {eq.title}
                            </h4>
                            <p className="text-xs text-zinc-500 mt-0.5 capitalize">
                              {t('common_filter')} : {eq.category.replace('_', ' ')}
                            </p>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                              eq.currentStatus === 'deployed_on_mission'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}
                          >
                            {eq.currentStatus === 'deployed_on_mission' ? t('pm_compta_badge_deployed') : t('pm_compta_badge_in_depot')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
                          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                            {eq.acquisitionCostDzd.toLocaleString()} DA
                          </span>
                          <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                            <History className="w-3.5 h-3.5" />
                            {eq.history?.length || 2} {t('common_actions')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Right 6 Cols: Slide 11 Dedicated Indirect Stock Lifecycle Timeline */}
            <div className="lg:col-span-6 space-y-4">
              <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs sticky top-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#C4785A] uppercase tracking-wider block">
                      {t('pm_compta_lifecycle_title')}
                    </span>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {selectedStockAsset?.assetCode} · {selectedStockAsset?.title}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    {selectedStockAsset?.acquisitionCostDzd.toLocaleString()} DA
                  </span>
                </div>

                {/* Acquisition Metadata */}
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-medium">{t('pm_compta_origin_acquisition')}</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {t('pm_compta_origin_field_purchased')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-medium">{t('pm_compta_fiscal_voucher')}</span>
                    <span className="text-emerald-600 font-mono font-bold text-[11px]">
                      {t('pm_compta_voucher_scanned')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-medium">{t('pm_compta_current_status')}</span>
                    <span className="font-semibold text-emerald-600">
                      {t('pm_compta_status_good')}
                    </span>
                  </div>
                </div>

                {/* Vertical Timeline matching Slide 11 */}
                <div className="space-y-4 pt-1">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    {t('pm_compta_history_title')}
                  </span>

                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
                    {(selectedStockAsset?.history || [
                      { date: '12/03', stage: 'Acheté & codé', detail: `${selectedStockAsset?.title} — ${selectedStockAsset?.acquisitionCostDzd.toLocaleString()} DA` },
                      { date: '15/03', stage: 'Affecté', detail: 'Roadshow Ooredoo — Oran' },
                      { date: '02/04', stage: 'Retour stock', detail: 'État contrôlé : bon' },
                      { date: '10/05', stage: 'Affecté', detail: 'Salon SITEV — Alger' },
                      { date: 'Auj.', stage: 'En stock', detail: 'Disponible — état : bon' },
                    ]).map((step, idx) => (
                      <div key={idx} className="relative group">
                        {/* Milestone Node */}
                        <div
                          className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 bg-white dark:bg-zinc-900 flex items-center justify-center transition-all ${
                            step.stage === 'En stock'
                              ? 'border-emerald-500 text-emerald-500'
                              : step.stage === 'Affecté'
                              ? 'border-[#C4785A] text-[#C4785A]'
                              : step.stage === 'Acheté & codé'
                              ? 'border-blue-500 text-blue-500'
                              : 'border-zinc-400 text-zinc-400'
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              step.stage === 'En stock'
                                ? 'bg-emerald-500'
                                : step.stage === 'Affecté'
                                ? 'bg-[#C4785A]'
                                : step.stage === 'Acheté & codé'
                                ? 'bg-blue-500'
                                : 'bg-zinc-400'
                            }`}
                          />
                        </div>

                        {/* Content */}
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100">
                              {step.date}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                step.stage === 'En stock'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : step.stage === 'Affecté'
                                  ? 'bg-amber-100 text-amber-800'
                                  : step.stage === 'Acheté & codé'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-zinc-100 text-zinc-800'
                              }`}
                            >
                              {step.stage}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            {step.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Controls for Asset Management */}
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updatePmEquipmentStatus(selectedStockAsset.id, 'deployed_on_mission', 'good');
                      if (showToast) {
                        showToast({
                          title: selectedStockAsset.assetCode,
                          message: t('pm_compta_badge_deployed'),
                          type: 'success',
                        });
                      }
                    }}
                    className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-[#C4785A] hover:bg-[#b3684a] rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    {t('pm_compta_btn_assign_mission')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updatePmEquipmentStatus(selectedStockAsset.id, 'in_stock');
                      if (showToast) {
                        showToast({
                          title: selectedStockAsset.assetCode,
                          message: t('pm_compta_badge_in_depot'),
                          type: 'info',
                        });
                      }
                    }}
                    className="py-2 px-3 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
                  >
                    {t('pm_compta_btn_return_stock')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (showToast) {
                        showToast({
                          title: t('pm_compta_btn_qr_label'),
                          message: `${selectedStockAsset.assetCode} : ${selectedStockAsset.qrLabelCode}`,
                          type: 'info',
                        });
                      }
                    }}
                    className="p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title={t('pm_compta_btn_qr_label')}
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official SFP 01 Slip Printable Modal */}
      <CcpSlipModal
        isOpen={Boolean(selectedSlip)}
        slip={selectedSlip}
        onClose={() => setSelectedSlip(null)}
        onMarkPrinted={markPmCcpSlipPrinted}
      />
    </div>
  );
};

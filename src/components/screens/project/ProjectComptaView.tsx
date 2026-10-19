import React, { useState } from 'react';
import { useAtriumStore } from '../../../services/store';
import { PMCcpSlip, PMExpense } from '../../../types/index';
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
} from 'lucide-react';

interface ProjectComptaViewProps {
  initialTab?: 'payroll' | 'ccp' | 'expenses' | 'stock';
}

export const ProjectComptaView: React.FC<ProjectComptaViewProps> = ({ initialTab }) => {
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

  const pendingBatches = pmPayrollBatches.filter((b) => b.status === 'approved_by_direction');


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C4785A]">
              Rôle 6 · Comptabilité, Paie & Finance
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-xs text-zinc-500">Bordereaux Algérie Poste (CCP SFP 01) & Audit Fiscal</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Centre Financier, Paies Animateurs & Stocks
          </h1>
        </div>

        {/* Global Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print?.()}
            className="px-3.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimer l'Audit Général
          </button>
        </div>
      </div>

      {/* Financial Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors ${
            activeTab === 'payroll'
              ? 'bg-[#C4785A] text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Lots de Paie (Clôtures Superviseur)
          {pendingBatches.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
              {pendingBatches.length} Prêts
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ccp')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors ${
            activeTab === 'ccp'
              ? 'bg-[#C4785A] text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Générateur Mandats CCP (SFP 01)
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono">
            {pmCcpSlips.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors ${
            activeTab === 'expenses'
              ? 'bg-[#C4785A] text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Audit Justificatifs & Factures
        </button>

        <button
          onClick={() => setActiveTab('stock')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors ${
            activeTab === 'stock'
              ? 'bg-[#C4785A] text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Parc Matériel & Inventaire
        </button>
      </div>

      {/* TAB 1: Automated Payroll Hub */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Lots de Paie Validés par la Direction
              </h3>
              <p className="text-xs text-zinc-500">
                Chaque lot issu d'un pointage mobile verrouillé et signé par la Direction peut générer ses bordereaux postaux en 1 clic.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {pmPayrollBatches.map((batch) => {
              const isApproved = batch.status === 'approved_by_direction' || batch.status === 'ccp_generated' || batch.status === 'disbursed';
              return (
                <div
                  key={batch.id}
                  className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        {batch.batchNumber}
                      </span>
                      <span className="text-zinc-300">·</span>
                      <span className="text-xs font-semibold text-[#C4785A]">
                        {batch.missionCode} — {batch.projectTitle}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          batch.status === 'ccp_generated'
                            ? 'bg-blue-100 text-blue-700'
                            : batch.status === 'approved_by_direction'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {batch.status === 'ccp_generated'
                          ? 'CCP GÉNÉRÉ'
                          : batch.status === 'approved_by_direction'
                          ? 'VALIDÉ PAR DG (PRÊT)'
                          : 'EN ATTENTE VISA DG'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Bénéficiaires : {batch.totalBeneficiaries} animateurs · Pointages verrouillés
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-xs text-zinc-400 block">Total Dinar</span>
                      <span className="font-mono font-bold text-lg text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {batch.totalAmountDzd.toLocaleString()} DA
                      </span>
                    </div>

                    {isApproved ? (
                      <button
                        onClick={() => {
                          generatePmCcpSlipsForBatch(batch.id);
                          setActiveTab('ccp');
                        }}
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#C4785A] hover:bg-[#b3684a] rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Générer Bordereaux SFP 01 (1-Clic) →
                      </button>
                    ) : (
                      <div className="px-3.5 py-2 text-xs font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/40 rounded-xl flex items-center gap-1.5 border border-amber-200">
                        <Lock className="w-3.5 h-3.5" />
                        Verrouillé (Attente DG)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: 1-Click Algerian Post (CCP SFP 01) Generator */}
      {activeTab === 'ccp' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Bordereaux Postaux SFP 01 Édités
              </h3>
              <p className="text-xs text-zinc-500">
                Montants transcrits automatiquement en lettres légales (Français et Arabe). Conformes aux guichets Algérie Poste.
              </p>
            </div>
            <button
              onClick={() => window.print?.()}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimer le Lot Complet (SFP 01)
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
                      <span className="text-zinc-500">CCP :</span>
                      <strong className="text-zinc-900 dark:text-zinc-100">
                        {slip.ccpNumber} Clé {slip.ccpKey}
                      </strong>
                    </div>
                    <div className="flex justify-between font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      <span>Montant :</span>
                      <span>{slip.amountDzd.toLocaleString()} DA</span>
                    </div>
                  </div>

                  <p className="font-serif italic text-[11px] text-zinc-500 line-clamp-2">
                    « {slip.amountInWordsFr} »
                  </p>
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400">
                    {slip.isPrinted ? 'Imprimé ✓' : 'Prêt pour guichet'}
                  </span>
                  <button
                    onClick={() => setSelectedSlip(slip)}
                    className="px-3 py-1 text-xs font-semibold text-[#C4785A] hover:bg-[#C4785A]/10 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Visualiser SFP 01
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
                  Journal des Dépenses de Terrain
                </h3>
                <p className="text-xs text-zinc-500">
                  Vérification des tickets de caisse, déductions TVA et factures fiscales.
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
                          FACTURE FISCALE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {exp.projectTitle} · Déclaré par {exp.declaredByUserName}
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
                      {exp.status === 'approved_by_direction' ? 'Validé DG' : 'En attente DG'}
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
                Visualiseur de Reçu & Conformité
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
                    <p>Désignation: <strong>{selectedExpense.title}</strong></p>
                    <p>Montant: <strong className="font-mono">{selectedExpense.amountDzd.toLocaleString()} DA</strong></p>
                    {selectedExpense.fiscalNif && (
                      <p className="font-mono text-[11px] text-emerald-600">
                        NIF Enregistré: {selectedExpense.fiscalNif}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 text-center py-12">
                  Sélectionnez une dépense pour inspecter son justificatif.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Equipment & Collateral Stock Tracker */}
      {activeTab === 'stock' && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Parc Matériel Agence & Équipements Réutilisables
              </h3>
              <p className="text-xs text-zinc-500">
                Suivi des structures métalliques, sonos, valises comptoirs et jupes imprimées.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                <tr>
                  <th className="p-3 rounded-l-lg">Code Actif</th>
                  <th className="p-3">Désignation</th>
                  <th className="p-3">Catégorie</th>
                  <th className="p-3">Statut & Garde Actuelle</th>
                  <th className="p-3">État Matériel</th>
                  <th className="p-3 text-right rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {pmEquipmentStock.map((eq) => (
                  <tr key={eq.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                    <td className="p-3 font-mono font-bold text-[#C4785A]">{eq.assetCode}</td>
                    <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">{eq.title}</td>
                    <td className="p-3 text-zinc-500 capitalize">{eq.category.replace('_', ' ')}</td>
                    <td className="p-3">
                      <div className="space-y-0.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            eq.currentStatus === 'deployed_on_mission'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {eq.currentStatus === 'deployed_on_mission' ? 'DÉPLOYÉ SUR SITE' : 'EN STOCK DÉPÔT'}
                        </span>
                        {eq.currentCustodianName && (
                          <span className="text-[11px] text-zinc-500 block">
                            Dépositaire: {eq.currentCustodianName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-emerald-600 font-medium">Bon état général</span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => alert(`Code-barre pour ${eq.assetCode}: ${eq.qrLabelCode}`)}
                        className="px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg inline-flex items-center gap-1"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        Label QR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

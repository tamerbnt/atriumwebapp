import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  Printer,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Coins,
  CreditCard,
  Building,
  User,
  Plus,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';

export const PosFinanceView: React.FC = () => {
  const { language } = useTranslation();
  const { sales, staff, currentBranch } = useAtriumStore();

  const [openingFloat, setOpeningFloat] = useState<number>(15000);
  const [countedCash, setCountedCash] = useState<number>(15000);
  const [disbursements, setDisbursements] = useState<Array<{ id: string; reason: string; amount: number; time: string }>>([
    { id: '1', reason: 'Achat consommables & papier thermique', amount: 1200, time: '11:15' },
    { id: '2', reason: 'Frais de livraison express coursier', amount: 600, time: '14:30' },
  ]);
  const [newDisbursementReason, setNewDisbursementReason] = useState('');
  const [newDisbursementAmount, setNewDisbursementAmount] = useState('');
  const [showDisbursementModal, setShowDisbursementModal] = useState(false);
  const [isZReportClosed, setIsZReportClosed] = useState(false);

  // Calculate Cash Sales vs Card/Other
  const cashSalesTotal = useMemo(() => {
    return sales
      .filter((s) => !s.paymentMethod || s.paymentMethod.toLowerCase().includes('esp') || s.paymentMethod.toLowerCase().includes('cash'))
      .reduce((sum, s) => sum + s.totalAmount, 0);
  }, [sales]);

  const cardSalesTotal = useMemo(() => {
    return sales
      .filter((s) => s.paymentMethod && (s.paymentMethod.toLowerCase().includes('carte') || s.paymentMethod.toLowerCase().includes('dahabia') || s.paymentMethod.toLowerCase().includes('cib') || s.paymentMethod.toLowerCase().includes('card')))
      .reduce((sum, s) => sum + s.totalAmount, 0);
  }, [sales]);

  const otherSalesTotal = useMemo(() => {
    return sales
      .filter((s) => s.paymentMethod && !s.paymentMethod.toLowerCase().includes('esp') && !s.paymentMethod.toLowerCase().includes('cash') && !s.paymentMethod.toLowerCase().includes('carte') && !s.paymentMethod.toLowerCase().includes('dahabia') && !s.paymentMethod.toLowerCase().includes('cib') && !s.paymentMethod.toLowerCase().includes('card'))
      .reduce((sum, s) => sum + s.totalAmount, 0);
  }, [sales]);

  const totalGrossSales = cashSalesTotal + cardSalesTotal + otherSalesTotal;

  const totalDisbursements = useMemo(() => {
    return disbursements.reduce((sum, d) => sum + d.amount, 0);
  }, [disbursements]);

  // Expected cash in drawer = Opening float + Cash sales - Disbursements
  const expectedCashInDrawer = openingFloat + cashSalesTotal - totalDisbursements;
  const cashVariance = countedCash - expectedCashInDrawer;

  const handleAddDisbursement = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newDisbursementAmount);
    if (!newDisbursementReason.trim() || isNaN(amt) || amt <= 0) return;

    setDisbursements([
      ...disbursements,
      {
        id: `disb_${Date.now()}`,
        reason: newDisbursementReason.trim(),
        amount: amt,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setNewDisbursementReason('');
    setNewDisbursementAmount('');
    setShowDisbursementModal(false);
    showToast({
      type: 'info',
      title: 'Décaissement enregistré',
      message: `${amt} DZD prélevés du tiroir-caisse`,
    });
  };

  const handlePrintZReport = () => {
    setIsZReportClosed(true);
    showToast({
      type: 'success',
      title: 'Clôture Z Générée',
      message: `Rapport de caisse journalier clôturé pour ${currentBranch.name}`,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FDF4F0] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700">
              <Wallet size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-neutral-900 dark:text-white">
                {language === 'ar' ? 'المالية وإدارة صندوق الكاشير' : language === 'fr' ? 'Finances Caisse & Rapport Z' : 'POS Cash Drawer & Z-Report'}
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {currentBranch.name} · {sales.length} ventes · Fond de caisse initial {formatMoney(openingFloat, language)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDisbursementModal(true)}
              className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowDownCircle size={15} className="text-rose-500" />
              <span>{language === 'ar' ? 'تسجيل سحب نقدي' : 'Décaissement caisse'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintZReport}
              className="px-4 py-2 rounded-xl bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer size={15} />
              <span>{language === 'ar' ? 'طباعة تقرير Z' : 'Imprimer Rapport Z'}</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800">
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
            <span className="text-xs font-semibold text-neutral-500 block">Total Ventes Brutes</span>
            <span className="text-xl font-black text-emerald-600 tabular-nums mt-1 block">
              {formatMoney(totalGrossSales, language)}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Tous modes de paiement</span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
            <span className="text-xs font-semibold text-neutral-500 block">Encaissements Espèces</span>
            <span className="text-xl font-black text-neutral-900 dark:text-white tabular-nums mt-1 block">
              {formatMoney(cashSalesTotal, language)}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Billets et pièces</span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
            <span className="text-xs font-semibold text-neutral-500 block">Cartes CIB & Dahabia</span>
            <span className="text-xl font-black text-blue-600 dark:text-blue-400 tabular-nums mt-1 block">
              {formatMoney(cardSalesTotal, language)}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Télé-collecte TPE</span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
            <span className="text-xs font-semibold text-neutral-500 block">Décaissements / Dépenses</span>
            <span className="text-xl font-black text-rose-600 tabular-nums mt-1 block">
              {formatMoney(totalDisbursements, language)}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">{disbursements.length} prélèvements caisse</span>
          </div>
        </div>
      </div>

      {/* Cash Drawer Reconciliation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Balancing & Float (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins size={18} className="text-[#C4785A]" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                Contrôle & Rapprochement du Tiroir-Caisse
              </h2>
            </div>
            {isZReportClosed && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={12} /> Z Clôturé
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
              <label className="text-xs font-semibold text-neutral-500 block mb-1">
                Fond de Caisse Initial (Ouverture)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm font-black tabular-nums text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C4785A]"
                />
                <span className="text-xs text-neutral-400 font-bold">DZD</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
              <label className="text-xs font-semibold text-neutral-500 block mb-1">
                Comptage Réel en Espèces (Fin de service)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={countedCash}
                  onChange={(e) => setCountedCash(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm font-black tabular-nums text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C4785A]"
                />
                <span className="text-xs text-neutral-400 font-bold">DZD</span>
              </div>
            </div>
          </div>

          {/* Breakdown summary */}
          <div className="space-y-2 border-t border-neutral-100 dark:border-neutral-800 pt-4 text-xs">
            <div className="flex justify-between py-1 text-neutral-600 dark:text-neutral-400">
              <span>(+) Fond de caisse initial :</span>
              <span className="font-mono font-semibold">{formatMoney(openingFloat, language)}</span>
            </div>
            <div className="flex justify-between py-1 text-neutral-600 dark:text-neutral-400">
              <span>(+) Total ventes espèces encaissées :</span>
              <span className="font-mono font-semibold text-emerald-600">+{formatMoney(cashSalesTotal, language)}</span>
            </div>
            <div className="flex justify-between py-1 text-neutral-600 dark:text-neutral-400">
              <span>(-) Décaissements et dépenses caisse :</span>
              <span className="font-mono font-semibold text-rose-600">-{formatMoney(totalDisbursements, language)}</span>
            </div>
            <div className="flex justify-between py-2 border-t border-neutral-200 dark:border-neutral-700 font-bold text-neutral-900 dark:text-white text-sm">
              <span>Espèces Théoriques Attendues dans le Tiroir :</span>
              <span className="font-mono">{formatMoney(expectedCashInDrawer, language)}</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 font-bold">
              <div className="flex items-center gap-2">
                {cashVariance === 0 ? (
                  <CheckCircle2 size={16} className="text-emerald-500" />
                ) : (
                  <AlertTriangle size={16} className={cashVariance > 0 ? 'text-blue-500' : 'text-rose-500'} />
                )}
                <span className="text-xs">
                  {cashVariance === 0
                    ? 'Caisse Parfaitement Équilibrée'
                    : cashVariance > 0
                    ? 'Excédent de Caisse (Surplus)'
                    : 'Déficit de Caisse (Manquant)'}
                </span>
              </div>
              <span
                className={`font-mono text-sm tabular-nums ${
                  cashVariance === 0
                    ? 'text-emerald-600'
                    : cashVariance > 0
                    ? 'text-blue-600'
                    : 'text-rose-600'
                }`}
              >
                {cashVariance > 0 ? `+${formatMoney(cashVariance, language)}` : formatMoney(cashVariance, language)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Disbursements History */}
        <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              Journal des Décaissements ({disbursements.length})
            </h2>
            <button
              type="button"
              onClick={() => setShowDisbursementModal(true)}
              className="text-xs font-bold text-[#C4785A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} /> Ajouter
            </button>
          </div>

          <div className="space-y-3">
            {disbursements.map((d) => (
              <div
                key={d.id}
                className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-neutral-900 dark:text-white block">{d.reason}</span>
                  <span className="text-[10px] text-neutral-400 font-mono">{d.time}</span>
                </div>
                <span className="font-mono font-bold text-rose-600 tabular-nums">
                  -{formatMoney(d.amount, language)}
                </span>
              </div>
            ))}

            {disbursements.length === 0 && (
              <div className="py-8 text-center text-xs text-neutral-400">
                Aucun prélèvement caisse enregistré.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Quick Disbursement */}
      {showDisbursementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-neutral-200 dark:border-neutral-800 shadow-xl max-w-md w-full animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-3">
              Nouveau Décaissement du Tiroir
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Enregistrez tout retrait en espèces (dépenses courantes, achats de fournitures urgentes).
            </p>

            <form onSubmit={handleAddDisbursement} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Motif / Justificatif
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Achat café pour l'équipe, coursier..."
                  value={newDisbursementReason}
                  onChange={(e) => setNewDisbursementReason(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C4785A]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Montant prélevé (DZD)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Ex: 1500"
                  value={newDisbursementAmount}
                  onChange={(e) => setNewDisbursementAmount(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C4785A]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDisbursementModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#C4785A] text-white hover:bg-[#b3684a]"
                >
                  Valider le retrait
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

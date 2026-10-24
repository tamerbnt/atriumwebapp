import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  DollarSign,
  FileText,
  Calendar,
  Building2,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { CommercialDocument } from '../../../types';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { useTranslation } from '../../../utils/useTranslation';

export const TradingFinanceView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const {
    commercialDocs,
    b2bClients,
    b2bSuppliers,
    updateCommercialDoc,
    updateB2bClient,
  } = useAtriumStore();

  const [settlementDoc, setSettlementDoc] = useState<CommercialDocument | null>(null);
  const [settleMethod, setSettleMethod] = useState('Virement bancaire');
  const [settleRef, setSettleRef] = useState('');
  const [settleDate, setSettleDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Invoices
  const invoices = useMemo(() => {
    return commercialDocs.filter((d) => d.type === 'facture');
  }, [commercialDocs]);

  // Aging Analysis (Balance Âgée)
  const agingAnalysis = useMemo(() => {
    const today = new Date().getTime();
    let bucketCurrent = 0; // 0-30 days
    let bucket31_60 = 0;   // 31-60 days
    let bucket61_90 = 0;   // 61-90 days
    let bucket90Plus = 0;  // > 90 days

    invoices.forEach((inv) => {
      if (inv.status === 'Paid') return;
      const invDate = new Date(inv.date).getTime();
      const diffDays = Math.max(0, Math.floor((today - invDate) / (1000 * 60 * 60 * 24)));

      if (diffDays <= 30) {
        bucketCurrent += inv.netToPay;
      } else if (diffDays <= 60) {
        bucket31_60 += inv.netToPay;
      } else if (diffDays <= 90) {
        bucket61_90 += inv.netToPay;
      } else {
        bucket90Plus += inv.netToPay;
      }
    });

    const totalUnpaid = bucketCurrent + bucket31_60 + bucket61_90 + bucket90Plus;
    const totalSupplierPayable = b2bSuppliers.reduce(
      (sum, s) => sum + (s.outstandingPayable || 0),
      0
    );

    return {
      bucketCurrent,
      bucket31_60,
      bucket61_90,
      bucket90Plus,
      totalUnpaid,
      totalSupplierPayable,
    };
  }, [invoices, b2bSuppliers]);

  // Handle Invoice Settlement
  const handleConfirmSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlementDoc) return;

    // Update invoice status to Paid
    updateCommercialDoc(settlementDoc.id, {
      status: 'Paid',
      paymentMethod: settleMethod,
      notesBottom: `Réglé le ${settleDate} par ${settleMethod}${settleRef ? ` (Réf: ${settleRef})` : ''}.`,
    });

    // Update client balance
    const client = b2bClients.find((c) => c.id === settlementDoc.clientId);
    if (client) {
      const newBal = Math.max(0, (client.outstandingBalance || 0) - settlementDoc.netToPay);
      updateB2bClient(client.id, { outstandingBalance: newBal });
    }

    setSettlementDoc(null);
  };

  const columns: ColumnDefinition<CommercialDocument>[] = [
    {
      key: 'docNumber',
      header: 'N° Facture',
      width: '160px',
      renderCell: (doc) => (
        <span className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100">
          {doc.docNumber}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date & Échéance',
      width: '140px',
      renderCell: (doc) => (
        <div className="text-xs font-mono">
          <div>{doc.date}</div>
          <div className="text-[10px] text-stone-400">Éch: {doc.dueDate || '30j'}</div>
        </div>
      ),
    },
    {
      key: 'client',
      header: 'Client B2B',
      minWidth: '220px',
      renderCell: (doc) => (
        <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
          {doc.clientName}
        </span>
      ),
    },
    {
      key: 'netToPay',
      header: 'Montant Net TTC',
      width: '140px',
      renderCell: (doc) => (
        <span className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100 tabular-nums">
          {formatMoney(doc.netToPay)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'État du Paiement',
      width: '130px',
      renderCell: (doc) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            doc.status === 'Paid'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
          }`}
        >
          {doc.status === 'Paid' ? 'Encaissée / Soldée' : 'Non Encaissée'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '140px',
      renderCell: (doc) => (
        <div className="flex items-center justify-end">
          {doc.status !== 'Paid' && (
            <button
              onClick={() => setSettlementDoc(doc)}
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1"
            >
              <CheckCircle size={13} />
              <span>Encaisser</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Règlements, Trésorerie & Balance Âgée
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C4785A]/15 text-[#C4785A]">
            Recouvrement B2B
          </span>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Suivi des échéances clients, encaissement des factures et balance des dettes fournisseurs
        </p>
      </div>

      {/* Aging Analysis Cards (Balance Âgée 4 Tranches) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bucket 1: 0 - 30 days */}
        <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 block mb-1">
            0 à 30 jours (Courant)
          </span>
          <div className="text-xl font-bold font-mono text-emerald-600 tabular-nums">
            {formatMoney(agingAnalysis.bucketCurrent)}
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">Créances normales</span>
        </div>

        {/* Bucket 2: 31 - 60 days */}
        <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 block mb-1">
            31 à 60 jours
          </span>
          <div className="text-xl font-bold font-mono text-amber-600 tabular-nums">
            {formatMoney(agingAnalysis.bucket31_60)}
          </div>
          <span className="text-[10px] text-amber-600/80 mt-1 block">Relance de courtoisie</span>
        </div>

        {/* Bucket 3: 61 - 90 days */}
        <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 block mb-1">
            61 à 90 jours
          </span>
          <div className="text-xl font-bold font-mono text-orange-600 tabular-nums">
            {formatMoney(agingAnalysis.bucket61_90)}
          </div>
          <span className="text-[10px] text-orange-600/80 mt-1 block">Mise en demeure requise</span>
        </div>

        {/* Bucket 4: > 90 days */}
        <div className="p-4 rounded-2xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 shadow-xs">
          <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 block mb-1">
            &gt; 90 jours (Contentieux)
          </span>
          <div className="text-xl font-bold font-mono text-rose-600 tabular-nums">
            {formatMoney(agingAnalysis.bucket90Plus)}
          </div>
          <span className="text-[10px] text-rose-500 mt-1 block">Dossier juridique B2B</span>
        </div>
      </div>

      {/* Invoices List with Settlement Action */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Factures Émises & Statut d'Encaissement ({invoices.length})
          </h2>
          <span className="text-xs font-mono text-stone-500">
            Total non encaissé : <strong className="text-rose-600">{formatMoney(agingAnalysis.totalUnpaid)}</strong>
          </span>
        </div>

        <UniversalDataCollection
          items={invoices}
          keyExtractor={(inv) => inv.id}
          columns={columns}
          renderCard={(inv) => (
            <div className="p-4 border rounded-xl space-y-1">
              <span className="font-mono text-xs">{inv.docNumber}</span>
              <p className="font-bold text-xs">{inv.clientName}</p>
            </div>
          )}
          emptyTitle="Aucune facture émise"
        />
      </div>

      {/* Settle Modal */}
      {settlementDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-600" />
              <span>Enregistrer le Règlement Client</span>
            </h2>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-stone-500">Facture :</span>
                <span className="font-bold text-stone-900 dark:text-stone-100">{settlementDoc.docNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Client :</span>
                <span className="text-stone-900 dark:text-stone-100">{settlementDoc.clientName}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-bold text-sm pt-1 border-t">
                <span>Montant Net :</span>
                <span>{formatMoney(settlementDoc.netToPay)}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmSettlement} className="space-y-3 text-xs">
              <LabelSelect
                label="Mode de Règlement Encaissé *"
                value={settleMethod}
                onChange={(val) => setSettleMethod(typeof val === 'string' ? val : val?.target?.value || val)}
                options={[
                  { value: "Virement bancaire", label: "Virement bancaire" },
                  { value: "Chèque barré", label: "Chèque barré" },
                  { value: "Chèque certifié", label: "Chèque certifié" },
                  { value: "Espèces (Timbré)", label: "Espèces (Timbre fiscal 1%)" },
                  { value: "Traite / Effet", label: "Traite / Effet commercial" }
                ]}
              />

              <LabelInput
                label="N° Chèque / Référence Virement"
                placeholder="Ex: CHQ-0091823"
                value={settleRef}
                onChange={(e) => setSettleRef(e.target.value)}
              />

              <LabelInput
                type="date"
                label="Date d'Encaissement *"
                value={settleDate}
                onChange={(e) => setSettleDate(e.target.value)}
                required
              />

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setSettlementDoc(null)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow-xs"
                >
                  Valider l'Encaissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  CheckCircle2,
  Boxes,
  FileText,
  Clock,
  Printer,
  Calendar,
  Trash2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { PurchaseDocument, PurchaseDocType, CommercialDocument } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { CommercialDocPrintModal } from './CommercialDocPrintModal';
import { useTranslation } from '../../../utils/useTranslation';

type PurchaseTab = 'all' | 'po' | 'br' | 'facture_fournisseur';

export const TradingPurchasesView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const {
    purchaseDocs,
    b2bSuppliers,
    warehouses,
    products,
    createPurchaseDoc,
    receivePurchaseDoc,
    currentBusiness,
    currentBranchId,
  } = useAtriumStore();

  const [activeTab, setActiveTab] = useState<PurchaseTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [printDoc, setPrintDoc] = useState<CommercialDocument | null>(null);

  const commercialDocFromPurchase = (p: PurchaseDocument): CommercialDocument => ({
    id: p.id,
    type: p.type === 'po' ? 'commande' : 'bl',
    docNumber: p.docNumber,
    clientId: p.supplierId,
    clientName: p.supplierName,
    depotId: p.depotId,
    depotName: p.depotName,
    date: p.orderDate,
    dueDate: p.deliveryExpectedDate,
    paymentMethod: 'Virement bancaire',
    paymentTerms: '30 jours',
    status: p.status === 'Received' ? 'Delivered' : 'Validated',
    items: p.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      description: it.description,
      isService: false,
      quantity: it.orderedQty,
      unit: it.unit,
      unitPriceHt: it.unitCostHt,
      tvaPercent: it.tvaPercent,
      totalHt: it.totalHt,
      totalTtc: it.totalHt * (1 + it.tvaPercent / 100),
    })),
    totalHtRaw: p.totalHt,
    generalDiscountPercent: 0,
    totalHtFinal: p.totalHt,
    totalTva: p.totalTva,
    timbreFiscal: 0,
    totalTtc: p.totalTtc,
    guaranteeRetentionPercent: 0,
    guaranteeRetentionAmount: 0,
    netToPay: p.totalTtc,
    currency: p.currency,
    notesTop: p.notes,
    includeStampSignature: true,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    tenantId: p.tenantId,
    facilityId: p.facilityId,
  });

  // New PO state
  const [supplierId, setSupplierId] = useState(b2bSuppliers[0]?.id || '');
  const [depotId, setDepotId] = useState(warehouses[0]?.id || 'depot_01');
  const [deliveryExpectedDate, setDeliveryExpectedDate] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState([
    {
      id: 'po_it_1',
      productId: products[0]?.id || '',
      description: products[0]?.name || '',
      orderedQty: 10,
      receivedQty: 0,
      unit: products[0]?.unit || 'pcs',
      unitCostHt: products[0]?.cost?.amount || 1000,
      tvaPercent: 19,
      totalHt: (products[0]?.cost?.amount || 1000) * 10,
    },
  ]);

  const filteredDocs = useMemo(() => {
    return purchaseDocs.filter((p) => {
      if (activeTab !== 'all' && p.type !== activeTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = p.docNumber.toLowerCase().includes(q);
        const matchesSup = p.supplierName.toLowerCase().includes(q);
        if (!matchesNum && !matchesSup) return false;
      }
      return true;
    });
  }, [purchaseDocs, activeTab, searchQuery]);

  const handleCreatePo = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = b2bSuppliers.find((s) => s.id === supplierId) || b2bSuppliers[0];
    const dep = warehouses.find((w) => w.id === depotId) || warehouses[0];
    const year = new Date().getFullYear();
    const count = purchaseDocs.filter((p) => p.type === 'po').length + 1;
    const docNumber = `PO-${year}-${count.toString().padStart(4, '0')}`;

    const totalHt = poItems.reduce((sum, it) => sum + (it.totalHt || 0), 0);
    const totalTva = totalHt * 0.19;

    createPurchaseDoc({
      tenantId: currentBusiness?.id || 'acc_01',
      facilityId: currentBranchId || 'fac_01',
      type: 'po',
      docNumber,
      supplierId: sup?.id || 'sup_01',
      supplierName: sup?.supplierName || 'Fournisseur',
      depotId: dep?.id || 'depot_01',
      depotName: dep?.name,
      orderDate: new Date().toISOString().split('T')[0],
      deliveryExpectedDate: deliveryExpectedDate || undefined,
      status: 'Ordered',
      items: poItems,
      totalHt,
      totalTva,
      totalTtc: totalHt + totalTva,
      currency: 'DZD',
      notes: poNotes.trim() || undefined,
    });

    setIsPoModalOpen(false);
  };

  const columns: ColumnDefinition<PurchaseDocument>[] = [
    {
      key: 'docNumber',
      header: 'N° Document',
      width: '180px',
      renderCell: (doc) => {
        const badgeColor =
          doc.type === 'po'
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
            : doc.type === 'br'
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
            : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400';

        return (
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${badgeColor}`}>
              {doc.type === 'po' ? 'PO' : doc.type === 'br' ? 'BR' : 'FF'}
            </span>
            <span className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100">
              {doc.docNumber}
            </span>
          </div>
        );
      },
    },
    {
      key: 'orderDate',
      header: 'Date Commande',
      width: '130px',
      renderCell: (doc) => (
        <span className="text-xs font-mono text-stone-700 dark:text-stone-300">
          {doc.orderDate}
        </span>
      ),
    },
    {
      key: 'supplier',
      header: 'Fournisseur Référencé',
      minWidth: '220px',
      renderCell: (doc) => (
        <div className="text-xs">
          <span className="font-bold text-stone-900 dark:text-stone-100 block">
            {doc.supplierName}
          </span>
          <span className="text-[10px] text-stone-400 font-mono">
            Dépôt : {doc.depotName || 'Dépôt Central'}
          </span>
        </div>
      ),
    },
    {
      key: 'itemsCount',
      header: 'Lignes',
      width: '90px',
      renderCell: (doc) => (
        <span className="text-xs font-mono text-stone-500">
          {doc.items.length} article(s)
        </span>
      ),
    },
    {
      key: 'totalTtc',
      header: 'Montant Total TTC',
      width: '140px',
      renderCell: (doc) => (
        <span className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100 tabular-nums">
          {formatMoney(doc.totalTtc)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      width: '130px',
      renderCell: (doc) => {
        const isReceived = doc.status === 'Received';
        return (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold inline-block ${
              isReceived
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
            }`}
          >
            {doc.status}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '160px',
      renderCell: (doc) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setPrintDoc(commercialDocFromPurchase(doc))}
            title="Imprimer le bon (PDF A4)"
            className="p-1.5 text-stone-400 hover:text-[#C4785A] hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
          >
            <Printer size={14} />
          </button>

          {doc.type === 'po' && doc.status === 'Ordered' && (
            <button
              onClick={() => receivePurchaseDoc(doc.id)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1 transition-colors"
            >
              <CheckCircle2 size={13} />
              <span>Réceptionner à quai</span>
            </button>
          )}

          {doc.type === 'br' && (
            <span className="text-[10px] font-mono text-emerald-600 font-medium">
              Stock incrémenté
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Cycle des Achats & Réceptions Fournisseurs
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C4785A]/15 text-[#C4785A]">
              {purchaseDocs.length} commandes & réceptions
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Approvisionnement, bons de commande d'achat (PO) et entrée automatique en stock à quai (BR)
          </p>
        </div>

        <button
          onClick={() => setIsPoModalOpen(true)}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#C4785A] hover:bg-[#b06749] text-white shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <Plus size={15} />
          <span>Créer Bon de Commande Achat (PO)</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
        <div className="flex items-center gap-2">
          {(
            [
              { key: 'all', label: 'Toutes les Pièces' },
              { key: 'po', label: 'Commandes d\'Achat (PO)' },
              { key: 'br', label: 'Bons de Réception à Quai (BR)' },
              { key: 'facture_fournisseur', label: 'Factures Fournisseurs' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === t.key
                  ? 'bg-[#C4785A]/10 text-[#C4785A] font-bold border border-[#C4785A]/30'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="w-64">
          <input
            type="text"
            placeholder="Rechercher document, fournisseur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-1.5 text-stone-800 dark:text-stone-200 placeholder-stone-400 focus:outline-hidden focus:border-[#C4785A]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs overflow-hidden">
        <UniversalDataCollection
          items={filteredDocs}
          keyExtractor={(d) => d.id}
          columns={columns}
          renderCard={(doc) => (
            <div className="p-4 border border-stone-200 dark:border-stone-800 rounded-xl space-y-2">
              <span className="font-mono font-bold text-xs">{doc.docNumber}</span>
              <p className="text-xs font-semibold">{doc.supplierName}</p>
              <div className="flex justify-between text-xs font-mono pt-2 border-t">
                <span className="text-stone-500">TTC :</span>
                <span className="font-bold">{formatMoney(doc.totalTtc)}</span>
              </div>
            </div>
          )}
          emptyTitle="Aucune commande d'achat"
          emptyDescription="Créez votre première commande d'achat fournisseur en cliquant sur le bouton ci-dessus."
        />
      </div>

      {/* PO Creation Modal */}
      {isPoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-stone-200 dark:border-stone-800">
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Truck size={18} className="text-[#C4785A]" />
                <span>Nouvelle Commande d'Achat Fournisseur (PO)</span>
              </h2>
              <button
                onClick={() => setIsPoModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <LabelSelect
                  label="Fournisseur *"
                  value={supplierId}
                  onChange={(val) => setSupplierId(typeof val === 'string' ? val : val?.target?.value || val)}
                  options={b2bSuppliers.map((s) => ({
                    value: s.id,
                    label: s.supplierName,
                  }))}
                />

                <LabelSelect
                  label="Dépôt de Destination *"
                  value={depotId}
                  onChange={(val) => setDepotId(typeof val === 'string' ? val : val?.target?.value || val)}
                  options={warehouses.map((w) => ({
                    value: w.id,
                    label: `${w.code} — ${w.name}`,
                  }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  type="date"
                  label="Date de Livraison Souhaitée"
                  value={deliveryExpectedDate}
                  onChange={(e) => setDeliveryExpectedDate(e.target.value)}
                />
                <LabelInput
                  label="Observations / Mention Bon de Pesée"
                  placeholder="Ex: Livraison par semi-remorque citerne..."
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                />
              </div>

              {/* Items */}
              <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <label className="font-semibold text-stone-700 dark:text-stone-300">
                  Article Commandé :
                </label>
                {poItems.map((it, idx) => (
                  <div key={idx} className="flex gap-2">
                    <select
                      className="flex-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1.5"
                      value={it.productId}
                      onChange={(e) => {
                        const prod = products.find((p) => p.id === e.target.value);
                        if (!prod) return;
                        setPoItems([
                          {
                            id: `po_it_${Date.now()}`,
                            productId: prod.id,
                            description: prod.name,
                            orderedQty: 10,
                            receivedQty: 0,
                            unit: prod.unit || 'pcs',
                            unitCostHt: prod.cost?.amount || 1000,
                            tvaPercent: 19,
                            totalHt: (prod.cost?.amount || 1000) * 10,
                          },
                        ]);
                      }}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Coût : {p.cost?.amount} DA)
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      className="w-24 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1.5 text-right font-mono"
                      value={it.orderedQty}
                      onChange={(e) => {
                        const q = parseFloat(e.target.value) || 0;
                        setPoItems([
                          {
                            ...it,
                            orderedQty: q,
                            totalHt: q * it.unitCostHt,
                          },
                        ]);
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsPoModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white font-semibold hover:bg-[#b06749]"
                >
                  Valider la Commande (PO)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Printable A4 Modal */}
      <CommercialDocPrintModal
        isOpen={!!printDoc}
        onClose={() => setPrintDoc(null)}
        document={printDoc}
      />
    </div>
  );
};

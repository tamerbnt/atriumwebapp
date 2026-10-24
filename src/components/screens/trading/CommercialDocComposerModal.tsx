import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  DollarSign,
  Building2,
  Calendar,
  Percent,
  CheckCircle,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import {
  CommercialDocument,
  CommercialDocType,
  CommercialDocItem,
  B2bClient,
  WarehouseDepot,
} from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';

interface CommercialDocComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: CommercialDocType;
  editingDoc?: CommercialDocument | null;
  onSaved?: (doc: CommercialDocument) => void;
}

export const CommercialDocComposerModal: React.FC<CommercialDocComposerModalProps> = ({
  isOpen,
  onClose,
  initialType = 'devis',
  editingDoc,
  onSaved,
}) => {
  const { t, isRtl, language } = useTranslation();
  const {
    b2bClients,
    warehouses,
    products,
    createCommercialDoc,
    updateCommercialDoc,
    allCommercialDocs,
  } = useAtriumStore();

  const isEdit = !!editingDoc;

  // Form State
  const [docType, setDocType] = useState<CommercialDocType>(
    editingDoc?.type || initialType
  );
  const [clientId, setClientId] = useState<string>(
    editingDoc?.clientId || b2bClients[0]?.id || ''
  );
  const [depotId, setDepotId] = useState<string>(
    editingDoc?.depotId || warehouses[0]?.id || 'depot_01'
  );
  const [date, setDate] = useState<string>(
    editingDoc?.date || new Date().toISOString().split('T')[0]
  );
  const [validityDays, setValidityDays] = useState<number>(
    editingDoc?.validityDays || 30
  );
  const [dueDate, setDueDate] = useState<string>(
    editingDoc?.dueDate || ''
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    editingDoc?.paymentMethod || 'Virement bancaire'
  );
  const [paymentTerms, setPaymentTerms] = useState<string>(
    editingDoc?.paymentTerms || '30 jours'
  );

  // Progressive Disclosure: Advanced & Fiscal Options
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(
    (editingDoc?.generalDiscountPercent || 0) > 0 ||
      (editingDoc?.guaranteeRetentionPercent || 0) > 0 ||
      !!editingDoc?.notesTop ||
      !!editingDoc?.notesBottom
  );
  const [generalDiscountPercent, setGeneralDiscountPercent] = useState<number>(
    editingDoc?.generalDiscountPercent || 0
  );
  const [guaranteeRetentionPercent, setGuaranteeRetentionPercent] = useState<number>(
    editingDoc?.guaranteeRetentionPercent || 0
  );
  const [isCashFiscalStampEnabled, setIsCashFiscalStampEnabled] = useState<boolean>(
    editingDoc?.timbreFiscal !== undefined
      ? editingDoc.timbreFiscal > 0
      : editingDoc?.paymentMethod?.toLowerCase().includes('espèces') || false
  );
  const [notesTop, setNotesTop] = useState<string>(editingDoc?.notesTop || '');
  const [notesBottom, setNotesBottom] = useState<string>(
    editingDoc?.notesBottom || ''
  );
  const [includeStampSignature, setIncludeStampSignature] = useState<boolean>(
    editingDoc?.includeStampSignature ?? true
  );

  // Line items state
  const [items, setItems] = useState<CommercialDocItem[]>(() => {
    if (editingDoc?.items && editingDoc.items.length > 0) {
      return editingDoc.items;
    }
    return [
      {
        id: `item_${Date.now()}_1`,
        productId: products[0]?.id || '',
        description: products[0]?.name || 'Article standard',
        isService: false,
        quantity: 1,
        unit: 'u',
        unitPriceHt: products[0]?.price?.amount || 1000,
        tvaPercent: 19,
        discountPercent: 0,
        totalHt: products[0]?.price?.amount || 1000,
        totalTtc: Math.round((products[0]?.price?.amount || 1000) * 1.19),
      },
    ];
  });

  // Selected client object
  const selectedClient = useMemo(() => {
    return b2bClients.find((c) => c.id === clientId) || b2bClients[0];
  }, [b2bClients, clientId]);

  // Selected depot object
  const selectedDepot = useMemo(() => {
    return warehouses.find((w) => w.id === depotId) || warehouses[0];
  }, [warehouses, depotId]);

  // Generate default doc number if new
  const generatedDocNumber = useMemo(() => {
    if (editingDoc) return editingDoc.docNumber;
    const year = new Date().getFullYear();
    const count =
      allCommercialDocs.filter((d) => d.type === docType).length + 1;
    const prefix =
      docType === 'devis'
        ? 'DEV'
        : docType === 'bl'
        ? 'BL'
        : docType === 'facture'
        ? 'FAC'
        : docType === 'commande'
        ? 'BC'
        : docType === 'avoir'
        ? 'AV'
        : 'RET';
    return `${prefix}-${year}-${count.toString().padStart(4, '0')}`;
  }, [docType, editingDoc, allCommercialDocs]);

  // Handle Item Row Changes
  const handleItemChange = (
    index: number,
    field: keyof CommercialDocItem,
    value: any
  ) => {
    setItems((prev) => {
      const next = [...prev];
      const target = { ...next[index], [field]: value };

      // Recalculate row totals
      const qty = Number(target.quantity) || 0;
      const puHt = Number(target.unitPriceHt) || 0;
      const disc = Number(target.discountPercent) || 0;
      const tva = Number(target.tvaPercent) || 0;

      const rawHt = qty * puHt;
      const netHt = rawHt * (1 - disc / 100);
      const ttc = netHt * (1 + tva / 100);

      target.totalHt = Math.round(netHt * 100) / 100;
      target.totalTtc = Math.round(ttc * 100) / 100;

      next[index] = target;
      return next;
    });
  };

  const handleProductSelect = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    setItems((prev) => {
      const next = [...prev];
      const unitPrice = prod.price?.amount || 0;
      const tva = prod.taxRate ?? 19;
      const isSrv = prod.category?.toLowerCase().includes('service') || false;

      next[index] = {
        ...next[index],
        productId: prod.id,
        description: prod.name,
        isService: isSrv,
        unit: prod.unit || 'u',
        unitPriceHt: unitPrice,
        tvaPercent: tva,
        discountPercent: 0,
        totalHt: unitPrice * (next[index].quantity || 1),
        totalTtc: Math.round(unitPrice * (next[index].quantity || 1) * (1 + tva / 100)),
      };
      return next;
    });
  };

  const addItemRow = () => {
    const newId = `item_${Date.now()}_${items.length + 1}`;
    setItems((prev) => [
      ...prev,
      {
        id: newId,
        productId: '',
        description: '',
        isService: false,
        quantity: 1,
        unit: 'u',
        unitPriceHt: 0,
        tvaPercent: 19,
        discountPercent: 0,
        totalHt: 0,
        totalTtc: 0,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const calculations = useMemo(() => {
    const totalHtRaw = items.reduce((sum, item) => sum + (item.totalHt || 0), 0);
    const genDiscAmount = totalHtRaw * (generalDiscountPercent / 100);
    const totalHtFinal = Math.max(0, totalHtRaw - genDiscAmount);

    // TVA distribution
    let totalTva = 0;
    items.forEach((item) => {
      const lineFraction = totalHtRaw > 0 ? (item.totalHt || 0) / totalHtRaw : 0;
      const adjustedLineHt = totalHtFinal * lineFraction;
      const lineTva = adjustedLineHt * ((item.tvaPercent || 0) / 100);
      totalTva += lineTva;
    });

    const isCash =
      paymentMethod.toLowerCase().includes('espèces') ||
      isCashFiscalStampEnabled;
    let timbreFiscal = 0;
    if (isCash) {
      // Algerian Finance Law: 1% stamp capped at 2,500 DZD
      const calculatedStamp = (totalHtFinal + totalTva) * 0.01;
      timbreFiscal = Math.min(2500, Math.max(20, Math.round(calculatedStamp)));
    }

    const totalTtc = totalHtFinal + totalTva + timbreFiscal;
    const guaranteeRetentionAmount =
      totalTtc * (guaranteeRetentionPercent / 100);
    const netToPay = totalTtc - guaranteeRetentionAmount;

    return {
      totalHtRaw: Math.round(totalHtRaw * 100) / 100,
      totalHtFinal: Math.round(totalHtFinal * 100) / 100,
      totalTva: Math.round(totalTva * 100) / 100,
      timbreFiscal,
      totalTtc: Math.round(totalTtc * 100) / 100,
      guaranteeRetentionAmount: Math.round(guaranteeRetentionAmount * 100) / 100,
      netToPay: Math.round(netToPay * 100) / 100,
    };
  }, [
    items,
    generalDiscountPercent,
    guaranteeRetentionPercent,
    paymentMethod,
    isCashFiscalStampEnabled,
  ]);

  const handleSubmit = (targetStatus: 'Draft' | 'Validated' | 'Delivered' = 'Validated') => {
    if (!clientId) {
      alert('Veuillez sélectionner un client destinataire.');
      return;
    }
    if (items.length === 0 || items.every((it) => !it.description)) {
      alert('Veuillez ajouter au moins une ligne d\'article avec désignation.');
      return;
    }

    const docPayload: Omit<CommercialDocument, 'id' | 'createdAt' | 'updatedAt'> = {
      type: docType,
      docNumber: generatedDocNumber,
      clientId,
      clientName: selectedClient?.companyName || 'Client Inconnu',
      clientNif: selectedClient?.nif,
      clientRc: selectedClient?.rc,
      clientAi: selectedClient?.ai,
      depotId,
      depotName: selectedDepot?.name || 'Dépôt Central',
      date,
      validityDays,
      dueDate: dueDate || undefined,
      paymentMethod,
      paymentTerms,
      status: targetStatus,
      items: items.filter((it) => it.description.trim() !== ''),
      totalHtRaw: calculations.totalHtRaw,
      generalDiscountPercent,
      totalHtFinal: calculations.totalHtFinal,
      totalTva: calculations.totalTva,
      timbreFiscal: calculations.timbreFiscal,
      totalTtc: calculations.totalTtc,
      guaranteeRetentionPercent,
      guaranteeRetentionAmount: calculations.guaranteeRetentionAmount,
      netToPay: calculations.netToPay,
      currency: 'DZD',
      notesTop: notesTop.trim() || undefined,
      notesBottom: notesBottom.trim() || undefined,
      includeStampSignature,
    };

    if (isEdit && editingDoc) {
      updateCommercialDoc(editingDoc.id, docPayload);
      if (onSaved) onSaved({ ...editingDoc, ...docPayload, updatedAt: new Date().toISOString() });
    } else {
      const created = createCommercialDoc(docPayload);
      if (onSaved) onSaved(created);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl my-auto bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C4785A]/10 text-[#C4785A] flex items-center justify-center font-bold">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                  {isEdit ? 'Modifier le document' : 'Nouveau Document Commercial'}
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-[#C4785A]/15 text-[#C4785A]">
                  {generatedDocNumber}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Génération conforme aux normes fiscales algériennes (NIF, TVA, Retenue & Timbre)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Top Bar: Doc Type Pill Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider mb-2">
              Type de Pièce Commerciale
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(
                [
                  { type: 'devis', label: 'Devis / Proforma', badge: 'DEV' },
                  { type: 'commande', label: 'Bon de Commande', badge: 'BC' },
                  { type: 'bl', label: 'Bon de Livraison', badge: 'BL' },
                  { type: 'facture', label: 'Facture Fiscale', badge: 'FAC' },
                  { type: 'avoir', label: 'Avoir / Retour', badge: 'AV' },
                ] as const
              ).map((item) => {
                const isSelected = docType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setDocType(item.type)}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-[#C4785A] bg-[#C4785A]/10 text-[#C4785A] shadow-xs font-bold'
                        : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:border-stone-300'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current opacity-70" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 1: Parties & Logistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-800/20">
            {/* Client Picker */}
            <div className="md:col-span-1">
              <LabelSelect
                label="Client B2B Destinataire *"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                {b2bClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName} {c.city ? `(${c.city})` : ''}
                  </option>
                ))}
              </LabelSelect>
              {selectedClient && (
                <div className="mt-2 p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[11px] space-y-1 text-stone-500">
                  <div className="flex justify-between">
                    <span>NIF (15 chiffres):</span>
                    <span className="font-mono text-stone-700 dark:text-stone-300">
                      {selectedClient.nif || 'Non renseigné'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Registre Comm. (RC):</span>
                    <span className="font-mono text-stone-700 dark:text-stone-300">
                      {selectedClient.rc || 'Non renseigné'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Encours / Crédit:</span>
                    <span className="font-mono text-stone-700 dark:text-stone-300">
                      {formatMoney(selectedClient.outstandingBalance || 0)} / {formatMoney(selectedClient.creditLimit || 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Warehouse Depot */}
            <div>
              <LabelSelect
                label="Dépôt de Sortie / Stock *"
                value={depotId}
                onChange={(e) => setDepotId(e.target.value)}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </LabelSelect>
              <div className="mt-2 text-[11px] text-stone-500 flex items-center gap-1.5">
                <Building2 size={13} className="text-[#C4785A]" />
                <span>{selectedDepot?.address}, {selectedDepot?.city}</span>
              </div>
            </div>

            {/* Dates & Payment */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <LabelInput
                  type="date"
                  label="Date d'Émission *"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <LabelInput
                  type="date"
                  label="Échéance"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <LabelSelect
                  label="Règlement"
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    if (e.target.value.toLowerCase().includes('espèces')) {
                      setIsCashFiscalStampEnabled(true);
                    }
                  }}
                >
                  <option value="Virement bancaire">Virement bancaire</option>
                  <option value="Chèque barré">Chèque barré</option>
                  <option value="Chèque certifié">Chèque certifié</option>
                  <option value="Espèces (Timbré)">Espèces (Timbre fiscal)</option>
                  <option value="Traite / Effet">Traite / Effet commercial</option>
                </LabelSelect>
                <LabelSelect
                  label="Condition"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                >
                  <option value="Comptant">Comptant à livraison</option>
                  <option value="15 jours">15 jours</option>
                  <option value="30 jours">30 jours fin de mois</option>
                  <option value="45 jours">45 jours</option>
                  <option value="60 jours">60 jours</option>
                  <option value="90 jours">90 jours</option>
                </LabelSelect>
              </div>
            </div>
          </div>

          {/* Section 2: Line Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                Articles & Prestations de Service ({items.length})
              </h3>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[#C4785A]/10 text-[#C4785A] hover:bg-[#C4785A]/20 transition-colors"
              >
                <Plus size={14} />
                <span>Ajouter une ligne</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-900">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500">
                  <tr>
                    <th className="py-2.5 px-3 w-[260px]">Article / Service</th>
                    <th className="py-2.5 px-2 w-[80px]">Unité</th>
                    <th className="py-2.5 px-2 w-[70px] text-right">Qté</th>
                    <th className="py-2.5 px-2 w-[110px] text-right">P.U. HT (DA)</th>
                    <th className="py-2.5 px-2 w-[70px] text-right">TVA %</th>
                    <th className="py-2.5 px-2 w-[70px] text-right">Remise %</th>
                    <th className="py-2.5 px-3 w-[110px] text-right">Total HT</th>
                    <th className="py-2.5 px-2 w-[40px] text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30">
                      {/* Product Selector / Description */}
                      <td className="p-2 space-y-1">
                        <select
                          className="w-full text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1 text-stone-800 dark:text-stone-200 focus:outline-hidden focus:border-[#C4785A]"
                          value={item.productId || ''}
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                        >
                          <option value="">-- Choisir dans le catalogue --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku ? `[${p.sku}] ` : ''}{p.name} ({p.price?.amount} DA)
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Désignation détaillée / référence"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1 text-stone-800 dark:text-stone-200 focus:outline-hidden focus:border-[#C4785A]"
                        />
                      </td>

                      {/* Unit */}
                      <td className="p-2">
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-full text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-1 py-1"
                        >
                          <option value="u">u</option>
                          <option value="pcs">pcs</option>
                          <option value="sac">sac</option>
                          <option value="barre">barre</option>
                          <option value="fut">fût</option>
                          <option value="tonne">tonne</option>
                          <option value="m">m</option>
                          <option value="m²">m²</option>
                          <option value="pack">pack</option>
                          <option value="carton">carton</option>
                          <option value="forfait">forfait</option>
                        </select>
                      </td>

                      {/* Quantity */}
                      <td className="p-2">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1 text-right font-mono"
                        />
                      </td>

                      {/* Unit Price HT */}
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unitPriceHt}
                          onChange={(e) => handleItemChange(idx, 'unitPriceHt', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1 text-right font-mono"
                        />
                      </td>

                      {/* TVA Percent */}
                      <td className="p-2">
                        <select
                          value={item.tvaPercent}
                          onChange={(e) => handleItemChange(idx, 'tvaPercent', parseInt(e.target.value, 10))}
                          className="w-full text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-1 py-1 text-right font-mono"
                        >
                          <option value="19">19%</option>
                          <option value="9">9%</option>
                          <option value="0">0%</option>
                        </select>
                      </td>

                      {/* Discount Percent */}
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent || 0}
                          onChange={(e) => handleItemChange(idx, 'discountPercent', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-2 py-1 text-right font-mono"
                        />
                      </td>

                      {/* Row Total HT */}
                      <td className="p-2 text-right font-mono font-semibold text-stone-900 dark:text-stone-100 tabular-nums">
                        {formatMoney(item.totalHt)}
                      </td>

                      {/* Delete Row */}
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          disabled={items.length <= 1}
                          className="p-1 text-stone-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-stone-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Progressive Disclosure: Advanced Options Accordion */}
          <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800/40 flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>Options avancées, Remise globale, Retenue de garantie & Fiscalité</span>
                {(generalDiscountPercent > 0 || guaranteeRetentionPercent > 0 || isCashFiscalStampEnabled) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#C4785A]/15 text-[#C4785A] font-mono">
                    Options actives
                  </span>
                )}
              </div>
              {showAdvancedOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showAdvancedOptions && (
              <div className="p-4 bg-white dark:bg-stone-900 space-y-4 border-t border-stone-200 dark:border-stone-800">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <LabelInput
                      type="number"
                      label="Remise Globale sur HT (%)"
                      value={generalDiscountPercent}
                      min={0}
                      max={100}
                      step={0.5}
                      onChange={(e) => setGeneralDiscountPercent(parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-[11px] text-stone-400 mt-1">
                      S'applique après les remises à la ligne.
                    </p>
                  </div>

                  <div>
                    <LabelInput
                      type="number"
                      label="Retenue de Garantie BTP (%)"
                      value={guaranteeRetentionPercent}
                      min={0}
                      max={20}
                      step={1}
                      onChange={(e) => setGuaranteeRetentionPercent(parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-[11px] text-stone-400 mt-1">
                      Usuellement 5% ou 10% pour les marchés et chantiers.
                    </p>
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800">
                      <input
                        type="checkbox"
                        checked={isCashFiscalStampEnabled}
                        onChange={(e) => setIsCashFiscalStampEnabled(e.target.checked)}
                        className="rounded text-[#C4785A] focus:ring-[#C4785A]"
                      />
                      <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
                        Appliquer le timbre fiscal (1% plafonné à 2,500 DA)
                      </span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <LabelInput
                    label="Mention d'en-tête (Objet / Chantier)"
                    placeholder="Ex: Marché N° 14/2026 — Chantier Nouvelle Ville Sidi Abdellah"
                    value={notesTop}
                    onChange={(e) => setNotesTop(e.target.value)}
                  />
                  <LabelInput
                    label="Mention de bas de page / Conditions légales"
                    placeholder="Ex: Marchandise vendue agréée, aucun retour après 48h..."
                    value={notesBottom}
                    onChange={(e) => setNotesBottom(e.target.value)}
                  />
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-600 dark:text-stone-400">
                    <input
                      type="checkbox"
                      checked={includeStampSignature}
                      onChange={(e) => setIncludeStampSignature(e.target.checked)}
                      className="rounded text-[#C4785A] focus:ring-[#C4785A]"
                    />
                    <span>Inclure l'emplacement Cachet et Signature de l'entreprise</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Financial Summary Box */}
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-stone-500 block text-[11px]">Total HT Brut</span>
                <span className="text-stone-800 dark:text-stone-200 font-semibold text-sm">
                  {formatMoney(calculations.totalHtRaw)}
                </span>
              </div>

              {generalDiscountPercent > 0 && (
                <div>
                  <span className="text-stone-500 block text-[11px]">Remise Globale ({generalDiscountPercent}%)</span>
                  <span className="text-rose-600 font-semibold text-sm">
                    -{formatMoney(calculations.totalHtRaw - calculations.totalHtFinal)}
                  </span>
                </div>
              )}

              <div>
                <span className="text-stone-500 block text-[11px]">Total HT Net</span>
                <span className="text-stone-800 dark:text-stone-200 font-semibold text-sm">
                  {formatMoney(calculations.totalHtFinal)}
                </span>
              </div>

              <div>
                <span className="text-stone-500 block text-[11px]">Total TVA</span>
                <span className="text-stone-800 dark:text-stone-200 font-semibold text-sm">
                  {formatMoney(calculations.totalTva)}
                </span>
              </div>

              {calculations.timbreFiscal > 0 && (
                <div>
                  <span className="text-stone-500 block text-[11px]">Droit de Timbre</span>
                  <span className="text-amber-600 font-semibold text-sm">
                    +{formatMoney(calculations.timbreFiscal)}
                  </span>
                </div>
              )}

              {calculations.guaranteeRetentionAmount > 0 && (
                <div>
                  <span className="text-stone-500 block text-[11px]">
                    Retenue Garantie ({guaranteeRetentionPercent}%)
                  </span>
                  <span className="text-blue-600 font-semibold text-sm">
                    -{formatMoney(calculations.guaranteeRetentionAmount)}
                  </span>
                </div>
              )}

              <div className="col-span-2 sm:col-span-1 p-2 rounded-lg bg-[#C4785A]/10 border border-[#C4785A]/30 sm:ml-auto w-full text-right">
                <span className="text-[#C4785A] block text-[11px] font-semibold uppercase">Net à Payer (TTC)</span>
                <span className="text-[#C4785A] font-bold text-base tabular-nums">
                  {formatMoney(calculations.netToPay)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            Annuler
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit('Draft')}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              Enregistrer comme Brouillon
            </button>

            <button
              type="button"
              onClick={() => handleSubmit('Validated')}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#C4785A] hover:bg-[#b06749] text-white shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CheckCircle size={15} />
              <span>{isEdit ? 'Enregistrer les Modifications' : 'Valider & Enregistrer'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

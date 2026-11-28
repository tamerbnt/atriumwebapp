import React, { useMemo, useState } from 'react';
import {
  Check,
  FileCheck2,
  Package,
  Plus,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
} from '../../../services/store';
import { evaluatePartWarrantyStatus, type GaragePurchaseOrderRecord } from '../../../utils/garageDepth';
import { formatMoney } from '../../../utils/rules';
import { useGarageData } from './garageData';
import { ScreenPod } from '../../ui/kinetic/ScreenPod';
import { KineticModalShell } from '../../ui/kinetic/KineticModalShell';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';

export interface AutoGaragePurchasingPanelProps {
  mode: 'purchasing' | 'warranties';
  language: string;
}

export const AutoGaragePurchasingPanel: React.FC<AutoGaragePurchasingPanelProps> = ({
  mode,
  language,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const { currentUser } = useAtriumSelector((s) => ({ currentUser: s.currentUser }), shallowEqualObjects);
  const {
    suppliers,
    purchaseOrders,
    parts,
    addSupplier,
    createPurchaseOrder,
    receivePurchaseOrderWithBl,
  } = useGarageData();

  // New Supplier modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supCity, setSupCity] = useState('Alger');
  const [supSpecialty, setSupSpecialty] = useState('');

  // New PO modal
  const [isCreatePoOpen, setIsCreatePoOpen] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState(suppliers[0]?.id || '');
  const [poPartId, setPoPartId] = useState(parts[0]?.id || '');
  const [poQty, setPoQty] = useState('10');
  const [poUnitCost, setPoUnitCost] = useState(String(parts[0]?.buyingPriceDzd || 3500));
  const [poWarrantyMonths, setPoWarrantyMonths] = useState('12');

  // BL Goods Receipt modal
  const [poToReceive, setPoToReceive] = useState<GaragePurchaseOrderRecord | null>(null);
  const [blNumber, setBlNumber] = useState('');
  const [receivedByName, setReceivedByName] = useState(currentUser?.fullName || 'Magasinier');

  const warrantyEntries = useMemo(
    () =>
      purchaseOrders
        .filter((po) => po.status === 'Received')
        .map((po) => ({
          po,
          evalStatus: evaluatePartWarrantyStatus(po),
        })),
    [purchaseOrders]
  );

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;
    const created = addSupplier({
      name: supName.trim(),
      phone: supPhone.trim() || '—',
      wilaya: supCity.trim() || 'Alger',
      specialty: supSpecialty.trim() || 'Pièces multi-marques',
      paymentTermsDays: 30,
      balanceDzd: 0,
    });
    setPoSupplierId(created.id);
    setSupName('');
    setSupPhone('');
    setSupSpecialty('');
    setIsSupplierModalOpen(false);
    showToast({
      type: 'success',
      title: L('Supplier Added', 'Fournisseur Ajouté', 'تمت إضافة المورد'),
      message: created.name,
    });
  };

  const handleSavePo = (e: React.FormEvent) => {
    e.preventDefault();
    const supplier = suppliers.find((s) => s.id === poSupplierId) || suppliers[0];
    const part = parts.find((p) => p.id === poPartId) || parts[0];
    const qty = Number.parseInt(poQty, 10);
    const cost = Number.parseFloat(poUnitCost);
    const warranty = Number.parseInt(poWarrantyMonths, 10);

    if (!supplier || !part || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(cost) || cost < 0) {
      showToast({
        type: 'error',
        title: L('Invalid Purchase Order', 'Bon de commande invalide', 'أمر شراء غير صالح'),
        message: L('Select supplier, part, positive quantity and cost.', 'Vérifiez le fournisseur, la pièce, la quantité et le prix.', 'تحقق من المورد والقطعة والكمية والسعر.'),
      });
      return;
    }

    const po = createPurchaseOrder({
      supplierId: supplier.id,
      supplierName: supplier.name,
      warrantyMonths: Number.isFinite(warranty) && warranty >= 0 ? warranty : 6,
      items: [
        {
          partId: part.id,
          sku: part.sku,
          name: part.name,
          quantity: qty,
          unitCostDzd: cost,
        },
      ],
    });

    setIsCreatePoOpen(false);
    showToast({
      type: 'success',
      title: L('PO Created', 'Bon de Commande Émis', 'تم إصدار الطلبية'),
      message: `${po.poNumber} · ${po.supplierName}`,
    });
  };

  const handleConfirmBlReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poToReceive) return;
    if (!blNumber.trim()) {
      showToast({
        type: 'error',
        title: L('BL Number Required', 'N° Bon de Livraison Requis', 'رقم وصل التسليم مطلوب'),
        message: L('Enter the supplier BL number to post stock receipt.', 'Saisissez le N° BL fournisseur pour réceptionner en stock.', 'أدخل رقم وصل التسليم لاستلام القطع في المخزن.'),
      });
      return;
    }
    const result = receivePurchaseOrderWithBl({
      poId: poToReceive.id,
      deliveryNoteNumber: blNumber.trim(),
      receivedByName: receivedByName.trim() || 'Magasinier',
    });
    setPoToReceive(null);
    setBlNumber('');
    showToast({
      type: 'success',
      title: L('Goods Received (BL)', 'Réception BL Validée', 'تم استلام وصل التسليم'),
      message: `${result.updatedPo.poNumber} · BL ${result.updatedPo.deliveryNoteNumber} (+${result.stockAdjustments.reduce((s, a) => s + a.addedQty, 0)} u.)`,
    });
  };

  if (mode === 'warranties') {
    return (
      <ScreenPod>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="t-pod font-semibold text-black dark:text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                <span>{L('Part Supplier Warranties & Expiration', 'Suivi Garanties Pièces Fournisseurs', 'ضمانات قطع الغيار')}</span>
              </h3>
              <p className="t-cap text-black/55 dark:text-white/60 mt-0.5">
                {L(
                  'Tracks active, expiring-soon, and expired warranties computed automatically from BL goods receipt.',
                  'Suivi automatique des garanties actives ou proches d’échéance dès la réception du Bon de Livraison (BL).',
                  'تتبع تلقائي لصلاحية ضمان القطع انطلاقاً من تاريخ وصل الاستلام.'
                )}
              </p>
            </div>
          </div>

          {warrantyEntries.length === 0 ? (
            <div data-sq="card" data-sq-border="solid" className="p-6 text-center t-cap text-black/55 dark:text-white/60 [--sq-stroke:var(--sq-stroke-card)]">
              {L('No received purchase orders with tracked warranty yet.', 'Aucune réception BL avec garantie enregistrée.', 'لا توجد استلامات بضمان مسجلة بعد.')}
            </div>
          ) : (
            <div data-sq="table" data-sq-border="solid" className="overflow-x-auto bg-white dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
              <table className="w-full text-left rtl:text-right t-cap">
                <thead className="bg-[#F5F1EC] dark:bg-[#191716] border-b border-[var(--atr-divider)] text-black/55 dark:text-white/55">
                  <tr>
                    <th className="py-2 px-3">{L('PO / BL', 'BC / BL', 'الطلب / الوصل')}</th>
                    <th className="py-2 px-3">{L('Supplier', 'Fournisseur', 'المورد')}</th>
                    <th className="py-2 px-3">{L('Parts', 'Pièces', 'القطع')}</th>
                    <th className="py-2 px-3">{L('Duration', 'Durée', 'المدة')}</th>
                    <th className="py-2 px-3">{L('Expires', 'Échéance', 'تاريخ الانتهاء')}</th>
                    <th className="py-2 px-3">{L('Status', 'Statut', 'الحالة')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--atr-divider)] tabular-nums">
                  {warrantyEntries.map(({ po, evalStatus }) => (
                    <tr key={po.id}>
                      <td className="py-2 px-3 font-semibold text-black dark:text-white">
                        {po.poNumber} · {po.deliveryNoteNumber || '—'}
                      </td>
                      <td className="py-2 px-3 text-black/75 dark:text-white/80">{po.supplierName}</td>
                      <td className="py-2 px-3 text-black/70 dark:text-white/75">
                        {po.items.map((i) => `${i.sku} (×${i.quantity})`).join(', ')}
                      </td>
                      <td className="py-2 px-3">{po.warrantyMonths || 0} {L('mo.', 'mois', 'أشهر')}</td>
                      <td className="py-2 px-3">{po.warrantyExpiryDate || '—'}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-[var(--r-check,6px)] t-small font-semibold ${
                            evalStatus.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : evalStatus.status === 'expiring_soon'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : evalStatus.status === 'expired'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                          }`}
                        >
                          {evalStatus.status === 'active'
                            ? L(`Active (${evalStatus.daysRemaining}d)`, `Active (${evalStatus.daysRemaining} j)`, `ساري (${evalStatus.daysRemaining} ي)`)
                            : evalStatus.status === 'expiring_soon'
                            ? L(`Expiring (${evalStatus.daysRemaining}d)`, `Expire bientôt (${evalStatus.daysRemaining} j)`, `قريب الانتهاء`)
                            : evalStatus.status === 'expired'
                            ? L('Expired', 'Expirée', 'منتهي')
                            : L('No warranty', 'Sans garantie', 'بدون ضمان')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ScreenPod>
    );
  }

  return (
    <div className="space-y-6">
      <ScreenPod>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="t-pod font-semibold text-black dark:text-white flex items-center gap-2">
                <Truck size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                <span>{L('Approved Parts Suppliers', 'Fournisseurs Pièces Agréés', 'موردو قطع الغيار المعتمدون')}</span>
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AtriumButton variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => setIsSupplierModalOpen(true)}>
                {L('New Supplier', 'Nouveau Fournisseur', 'مورد جديد')}
              </AtriumButton>
              <AtriumButton
                variant="primary"
                size="sm"
                icon={<Package size={14} />}
                onClick={() => {
                  const firstPart = parts[0];
                  if (firstPart) {
                    setPoPartId(firstPart.id);
                    setPoUnitCost(String(firstPart.buyingPriceDzd));
                  }
                  setIsCreatePoOpen(true);
                }}
              >
                {L('New Supplier PO', 'Nouveau BC Fournisseur', 'أمر شراء جديد')}
              </AtriumButton>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 t-cap">
            {suppliers.map((sup) => (
              <div
                key={sup.id}
                data-sq="card"
                data-sq-border="solid"
                className="p-3.5 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] space-y-1"
              >
                <div className="font-semibold text-black dark:text-white">{sup.name}</div>
                <div className="text-black/60 dark:text-white/65">{sup.specialty || 'Multi-marques'} · {sup.wilaya || 'Alger'}</div>
                <div className="text-black/55 dark:text-white/55 tabular-nums">{sup.phone} · {sup.paymentTermsDays || 30}j</div>
              </div>
            ))}
          </div>
        </div>
      </ScreenPod>

      <ScreenPod>
        <div className="space-y-4">
          <h3 className="t-pod font-semibold text-black dark:text-white flex items-center gap-2">
            <FileCheck2 size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
            <span>{L('Purchase Orders & BL Goods Receipts', 'Bons de Commande & Réceptions BL', 'طلبيات الشراء ووصلات الاستلام')}</span>
          </h3>
          <div data-sq="table" data-sq-border="solid" className="overflow-x-auto bg-white dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)]">
            <table className="w-full text-left rtl:text-right t-cap">
              <thead className="bg-[#F5F1EC] dark:bg-[#191716] border-b border-[var(--atr-divider)] text-black/55 dark:text-white/55">
                <tr>
                  <th className="py-2 px-3">{L('PO #', 'N° BC', 'رقم الطلبية')}</th>
                  <th className="py-2 px-3">{L('Supplier', 'Fournisseur', 'المورد')}</th>
                  <th className="py-2 px-3">{L('Lines', 'Articles', 'المواد')}</th>
                  <th className="py-2 px-3 text-right">{L('Total HT', 'Total HT', 'المبلغ')}</th>
                  <th className="py-2 px-3">{L('BL / Status', 'N° BL / Statut', 'الحالة / الوصل')}</th>
                  <th className="py-2 px-3 text-right">{L('Action', 'Action', 'إجراء')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--atr-divider)] tabular-nums">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-[#FAF7F4] dark:hover:bg-[#282523]">
                    <td className="py-2 px-3 font-semibold text-black dark:text-white">{po.poNumber}</td>
                    <td className="py-2 px-3 text-black/75 dark:text-white/80">{po.supplierName}</td>
                    <td className="py-2 px-3 text-black/70 dark:text-white/75">
                      {po.items.map((l) => `${l.name} (×${l.quantity})`).join(', ')}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold">{formatMoney(po.totalDzd, language)}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-[var(--r-check,6px)] t-small font-semibold ${
                          po.status === 'Received'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {po.status === 'Received'
                          ? `BL ${po.deliveryNoteNumber || 'OK'}`
                          : po.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      {po.status !== 'Received' && po.status !== 'Cancelled' ? (
                        <AtriumButton
                          variant="primary"
                          size="sm"
                          icon={<Check size={13} />}
                          onClick={() => {
                            setPoToReceive(po);
                            setBlNumber(`BL-${new Date().getFullYear()}-${String(purchaseOrders.length + 10).padStart(3, '0')}`);
                          }}
                        >
                          {L('Receive BL', 'Réceptionner BL', 'استلام BL')}
                        </AtriumButton>
                      ) : (
                        <span className="text-black/45 dark:text-white/45">{po.receivedAt ? new Date(po.receivedAt).toLocaleDateString() : '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ScreenPod>

      <KineticModalShell isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} maxWidthClass="max-w-md" zIndexClass="z-50" scrimClassName="bg-black/60">
        <div data-sq="panel" data-sq-border="solid" className="w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-[var(--atr-divider)]">
            <h3 className="t-card font-semibold text-black dark:text-white">{L('Add Supplier', 'Nouveau Fournisseur', 'إضافة مورد')}</h3>
            <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="p-1 cursor-pointer"><X size={18} /></button>
          </div>
          <form onSubmit={handleSaveSupplier} className="space-y-3">
            <LabelInput label={L('Company Name *', 'Raison Sociale *', 'اسم المورد *')} value={supName} onChange={setSupName} required />
            <div className="grid grid-cols-2 gap-3">
              <LabelInput label={L('Phone', 'Téléphone', 'الهاتف')} value={supPhone} onChange={setSupPhone} />
              <LabelInput label={L('City', 'Wilaya / Ville', 'المدينة')} value={supCity} onChange={setSupCity} />
            </div>
            <LabelInput label={L('Specialty', 'Spécialité', 'التخصص')} value={supSpecialty} onChange={setSupSpecialty} placeholder="Freinage, Filtration..." />
            <div className="flex justify-end gap-2 pt-2">
              <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setIsSupplierModalOpen(false)}>{L('Cancel', 'Annuler', 'إلغاء')}</AtriumButton>
              <AtriumButton type="submit" variant="primary" size="sm">{L('Save', 'Enregistrer', 'حفظ')}</AtriumButton>
            </div>
          </form>
        </div>
      </KineticModalShell>

      <KineticModalShell isOpen={isCreatePoOpen} onClose={() => setIsCreatePoOpen(false)} maxWidthClass="max-w-md" zIndexClass="z-50" scrimClassName="bg-black/60">
        <div data-sq="panel" data-sq-border="solid" className="w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-[var(--atr-divider)]">
            <h3 className="t-card font-semibold text-black dark:text-white">{L('Create Supplier PO', 'Émettre Bon de Commande', 'إنشاء طلبية شراء')}</h3>
            <button type="button" onClick={() => setIsCreatePoOpen(false)} className="p-1 cursor-pointer"><X size={18} /></button>
          </div>
          <form onSubmit={handleSavePo} className="space-y-3">
            <LabelSelect
              label={L('Supplier *', 'Fournisseur *', 'المورد *')}
              value={poSupplierId}
              onChange={setPoSupplierId}
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            />
            <LabelSelect
              label={L('Spare Part *', 'Pièce de rechange *', 'قطعة الغيار *')}
              value={poPartId}
              onChange={(nextId) => {
                setPoPartId(nextId);
                const p = parts.find((item) => item.id === nextId);
                if (p) setPoUnitCost(String(p.buyingPriceDzd));
              }}
              options={parts.map((p) => ({ value: p.id, label: `${p.sku} · ${p.name}` }))}
            />
            <div className="grid grid-cols-3 gap-2">
              <LabelInput type="number" label={L('Qty *', 'Qté *', 'الكمية *')} value={poQty} onChange={setPoQty} required />
              <LabelInput type="number" label={L('Unit Cost', 'PU Achat', 'سعر الوحدة')} value={poUnitCost} onChange={setPoUnitCost} required />
              <LabelInput type="number" label={L('Warranty (m)', 'Garantie (mois)', 'الضمان (شهر)')} value={poWarrantyMonths} onChange={setPoWarrantyMonths} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setIsCreatePoOpen(false)}>{L('Cancel', 'Annuler', 'إلغاء')}</AtriumButton>
              <AtriumButton type="submit" variant="primary" size="sm">{L('Issue PO', 'Émettre BC', 'إصدار الطلبية')}</AtriumButton>
            </div>
          </form>
        </div>
      </KineticModalShell>

      <KineticModalShell isOpen={Boolean(poToReceive)} onClose={() => setPoToReceive(null)} maxWidthClass="max-w-md" zIndexClass="z-50" scrimClassName="bg-black/60">
        {poToReceive && (
          <div data-sq="panel" data-sq-border="solid" className="w-full bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-[var(--atr-divider)]">
              <h3 className="t-card font-semibold text-black dark:text-white">
                {L('Goods Receipt (BL)', 'Réception Marchandise (BL)', 'استلام وصل التسليم (BL)')} — {poToReceive.poNumber}
              </h3>
              <button type="button" onClick={() => setPoToReceive(null)} className="p-1 cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleConfirmBlReceipt} className="space-y-3">
              <LabelInput
                label={L('Supplier Delivery Note (BL) # *', 'N° Bon de Livraison Fournisseur *', 'رقم وصل التسليم (BL) *')}
                value={blNumber}
                onChange={setBlNumber}
                placeholder="BL-2026-091"
                required
              />
              <LabelInput
                label={L('Received By', 'Réceptionné par', 'المستلم')}
                value={receivedByName}
                onChange={setReceivedByName}
                required
              />
              <div data-sq="card" data-sq-border="none" className="p-3 bg-[#F5F1EC] dark:bg-[#22201E] t-cap space-y-1">
                {poToReceive.items.map((l) => (
                  <div key={l.partId} className="flex justify-between">
                    <span>{l.sku} · {l.name}</span>
                    <span className="font-semibold">+{l.quantity} u.</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <AtriumButton type="button" variant="ghost" size="sm" onClick={() => setPoToReceive(null)}>{L('Cancel', 'Annuler', 'إلغاء')}</AtriumButton>
                <AtriumButton type="submit" variant="primary" size="sm" icon={<Check size={14} />}>
                  {L('Confirm Stock Receipt', 'Valider Réception Stock', 'تأكيد الاستلام في المخزن')}
                </AtriumButton>
              </div>
            </form>
          </div>
        )}
      </KineticModalShell>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  FileText,
  Truck,
  Boxes,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Plus,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { CommercialDocType, CommercialDocument } from '../../../types';
import { CommercialDocComposerModal } from './CommercialDocComposerModal';
import { StockMovementModal } from './StockMovementModal';
import { CommercialDocPrintModal } from './CommercialDocPrintModal';
import { useTranslation } from '../../../utils/useTranslation';

interface TradingDashboardViewProps {
  onNavigateTab?: (tabKey: string) => void;
}

export const TradingDashboardView: React.FC<TradingDashboardViewProps> = () => {
  const { t, isRtl, language } = useTranslation();
  const {
    commercialDocs,
    purchaseDocs,
    products,
    warehouses,
    setScreen,
    convertCommercialDoc,
  } = useAtriumStore();

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState<CommercialDocType>('devis');
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [printDoc, setPrintDoc] = useState<CommercialDocument | null>(null);

  // KPIs
  const stats = useMemo(() => {
    // Invoices
    const invoices = commercialDocs.filter((d) => d.type === 'facture');
    const totalInvoicedHt = invoices.reduce((sum, d) => sum + (d.totalHtFinal || 0), 0);
    const unpaidInvoices = invoices.filter((d) => d.status !== 'Paid');
    const totalUnpaidAmount = unpaidInvoices.reduce((sum, d) => sum + (d.netToPay || 0), 0);

    // Unbilled Delivery Slips (BLs without corresponding invoice)
    const unbilledBls = commercialDocs.filter(
      (d) => d.type === 'bl' && d.status === 'Delivered'
    );
    const unbilledBlAmount = unbilledBls.reduce((sum, d) => sum + (d.netToPay || 0), 0);

    // Inventory Valuation
    const totalStockValuation = products.reduce(
      (sum, p) => sum + (p.stockQuantity || 0) * (p.cost?.amount || p.costPrice || 0),
      0
    );

    // Low stock items
    const lowStockCount = products.filter(
      (p) => (p.stockQuantity || 0) <= (p.reorderLevel || 10)
    ).length;

    // Pending supplier deliveries
    const pendingPurchases = purchaseDocs.filter(
      (p) => p.type === 'po' && p.status === 'Ordered'
    );

    return {
      totalInvoicedHt,
      unpaidInvoicesCount: unpaidInvoices.length,
      totalUnpaidAmount,
      unbilledBlsCount: unbilledBls.length,
      unbilledBlAmount,
      totalStockValuation,
      lowStockCount,
      pendingPurchasesCount: pendingPurchases.length,
      unbilledBls,
    };
  }, [commercialDocs, purchaseDocs, products]);

  const handleOpenComposer = (type: CommercialDocType) => {
    setComposerType(type);
    setComposerOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Greeting */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {t('trading_dash_title')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C4785A]/15 text-[#C4785A] border border-[#C4785A]/30">
              {t('trading_dash_wholesale_tag')}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {t('trading_dash_subtitle')}
          </p>
        </div>

        {/* Action Shortcut Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenComposer('devis')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300 text-stone-700 dark:text-stone-300 flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus size={14} className="text-[#C4785A]" />
            <span>{t('trading_dash_btn_new_devis')}</span>
          </button>

          <button
            onClick={() => handleOpenComposer('bl')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300 text-stone-700 dark:text-stone-300 flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Truck size={14} className="text-[#C4785A]" />
            <span>{t('trading_dash_btn_new_bl')}</span>
          </button>

          <button
            onClick={() => handleOpenComposer('facture')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#C4785A] hover:bg-[#b06749] text-white shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <FileText size={14} />
            <span>{t('trading_dash_btn_new_invoice')}</span>
          </button>
        </div>
      </div>

      {/* Critical Alert Banner: Unbilled Delivery Slips (BLs) */}
      {stats.unbilledBlsCount > 0 && (
        <div className="p-4 rounded-2xl border border-amber-300 dark:border-amber-900/60 bg-gradient-to-r from-amber-50 to-orange-50/60 dark:from-amber-950/30 dark:to-stone-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                {t('trading_dash_unbilled_bl_alert_title', { count: stats.unbilledBlsCount })}
              </h3>
              <p className="text-[11px] text-amber-700/90 dark:text-amber-400/80 mt-0.5">
                {t('trading_dash_unbilled_bl_alert_desc', { amount: formatMoney(stats.unbilledBlAmount) })}
              </p>
            </div>
          </div>

          <button
            onClick={() => setScreen('trading_sales')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shrink-0 shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <span>{t('trading_dash_view_bls')}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Primary KPI Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Chiffre d'Affaires Facturé */}
        <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">{t('trading_dash_turnover_ht')}</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono tracking-tight text-stone-900 dark:text-stone-100 tabular-nums">
              {formatMoney(stats.totalInvoicedHt)}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-600 font-medium">
              <ArrowUpRight size={13} />
              <span>{t('trading_dash_invoiced_this_month')}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Créances Clients / Impayés */}
        <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">{t('trading_dash_receivables')}</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono tracking-tight text-rose-600 tabular-nums">
              {formatMoney(stats.totalUnpaidAmount)}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-stone-500">
              <span>{t('trading_dash_pending_invoices', { count: stats.unpaidInvoicesCount })}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Valorisation Globale Stock */}
        <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">{t('trading_dash_stock_value')}</span>
            <div className="p-2 rounded-xl bg-[#C4785A]/10 text-[#C4785A]">
              <Boxes size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono tracking-tight text-stone-900 dark:text-stone-100 tabular-nums">
              {formatMoney(stats.totalStockValuation)}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-stone-500">
              <span>{t('trading_dash_active_depots', { warehouses: warehouses.length, products: products.length })}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Commandes Fournisseurs en cours */}
        <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">{t('trading_dash_supplier_purchases')}</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
              <Truck size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono tracking-tight text-stone-900 dark:text-stone-100 tabular-nums">
              {t('trading_dash_orders_count', { count: stats.pendingPurchasesCount })}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-blue-600 font-medium">
              <span>{t('trading_dash_orders_pending_dock')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Documents & Depot Stock Pulse */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Commercial Documents (2 Cols) */}
        <div className="lg:col-span-2 border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {t('trading_dash_recent_docs')}
              </h2>
              <p className="text-xs text-stone-500">{t('trading_dash_recent_docs_sub')}</p>
            </div>
            <button
              onClick={() => setScreen('trading_sales')}
              className="text-xs font-semibold text-[#C4785A] hover:underline flex items-center gap-1"
            >
              <span>{t('trading_dash_view_sales_cycle')}</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {commercialDocs.slice(0, 5).map((doc) => (
              <div
                key={doc.id}
                className="py-3 flex items-center justify-between hover:bg-stone-50/60 dark:hover:bg-stone-800/30 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                      doc.type === 'facture'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : doc.type === 'bl'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                        : doc.type === 'devis'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                    }`}
                  >
                    {doc.type.toUpperCase().slice(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100">
                        {doc.docNumber}
                      </span>
                      <span className="text-xs text-stone-600 dark:text-stone-400 truncate max-w-[180px]">
                        {doc.clientName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-stone-400 font-mono mt-0.5">
                      <span>{doc.date}</span>
                      <span>•</span>
                      <span>{doc.items.length} article(s)</span>
                      <span>•</span>
                      <span>{doc.depotName || 'Oued Smar'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100 block tabular-nums">
                      {formatMoney(doc.netToPay)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        doc.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : doc.status === 'Delivered'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                          : doc.status === 'Validated'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPrintDoc(doc)}
                      title="Imprimer / PDF officiel"
                      className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    >
                      <FileText size={15} />
                    </button>
                    {doc.type === 'devis' && (
                      <button
                        onClick={() => convertCommercialDoc(doc.id, 'bl')}
                        title="Convertir en Bon de Livraison"
                        className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        {t('trading_dash_convert_bl')}
                      </button>
                    )}
                    {doc.type === 'bl' && doc.status === 'Delivered' && (
                      <button
                        onClick={() => convertCommercialDoc(doc.id, 'facture')}
                        title="Convertir en Facture fiscale"
                        className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        {t('trading_dash_bill')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Depots Status & Quick Stock Movements */}
        <div className="space-y-6">
          {/* Depots Status Widget */}
          <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {t('trading_dash_depots_state')}
              </h2>
              <button
                onClick={() => setStockModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#C4785A] hover:underline"
              >
                <Plus size={13} />
                <span>{t('trading_inventory_new_movement')}</span>
              </button>
            </div>

            <div className="space-y-3">
              {warehouses.map((w) => (
                <div
                  key={w.id}
                  className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/20"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
                      {w.name}
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-700 font-semibold text-stone-700 dark:text-stone-300">
                      {w.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mb-2">{w.address}</p>
                  <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-stone-200/60 dark:border-stone-700/60">
                    <span className="text-stone-500 text-[11px]">Valorisation :</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      {formatMoney(w.totalValuationDzd || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Shortcuts to other modules */}
          <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 shadow-xs p-5 space-y-3">
            <h3 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
              {t('trading_dash_operational_access')}
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setScreen('trading_sales')}
                className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-[#C4785A] text-left transition-colors group"
              >
                <span className="font-bold block text-stone-900 dark:text-stone-100 group-hover:text-[#C4785A]">
                  {t('trading_dash_cycle_sales')}
                </span>
                <span className="text-[10px] text-stone-400">{t('trading_dash_cycle_sales_sub')}</span>
              </button>

              <button
                onClick={() => setScreen('trading_purchases')}
                className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-[#C4785A] text-left transition-colors group"
              >
                <span className="font-bold block text-stone-900 dark:text-stone-100 group-hover:text-[#C4785A]">
                  {t('trading_dash_cycle_purchases')}
                </span>
                <span className="text-[10px] text-stone-400">{t('trading_dash_cycle_purchases_sub')}</span>
              </button>

              <button
                onClick={() => setScreen('trading_directory')}
                className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-[#C4785A] text-left transition-colors group"
              >
                <span className="font-bold block text-stone-900 dark:text-stone-100 group-hover:text-[#C4785A]">
                  {t('trading_dash_partners_b2b')}
                </span>
                <span className="text-[10px] text-stone-400">{t('trading_dash_partners_b2b_sub')}</span>
              </button>

              <button
                onClick={() => setScreen('trading_inventory')}
                className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-[#C4785A] text-left transition-colors group"
              >
                <span className="font-bold block text-stone-900 dark:text-stone-100 group-hover:text-[#C4785A]">
                  {t('trading_dash_depots_stock')}
                </span>
                <span className="text-[10px] text-stone-400">{t('trading_dash_depots_stock_sub')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CommercialDocComposerModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        initialType={composerType}
      />

      <StockMovementModal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
      />

      <CommercialDocPrintModal
        isOpen={!!printDoc}
        onClose={() => setPrintDoc(null)}
        document={printDoc}
      />
    </div>
  );
};

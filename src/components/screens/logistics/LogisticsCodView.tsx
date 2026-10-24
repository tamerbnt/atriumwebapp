import React, { useState } from 'react';
import { CreditCard, DollarSign, CheckCircle2, ArrowUpRight, Building2, Send } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useLogisticsData } from './logisticsData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';

export const LogisticsCodView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { shipments } = useLogisticsData();

  const [searchQuery, setSearchQuery] = useState('');
  const [settledIds, setSettledIds] = useState<string[]>([]);

  const formatMoney = (amount: number) => {
    return `${amount.toLocaleString()} DZD`;
  };

  const deliveredShipments = shipments.filter((s) => s.status === 'Delivered');

  const totalCodCollected = deliveredShipments.reduce((acc, s) => acc + s.codAmountDzd, 0);
  const totalShippingFees = deliveredShipments.reduce((acc, s) => acc + s.shippingFeeDzd, 0);
  const totalNetToMerchants = totalCodCollected - totalShippingFees;

  const filteredShipments = deliveredShipments.filter((s) =>
    s.merchantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.recipientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSettle = (id: string, merchant: string, netAmount: number) => {
    setSettledIds((prev) => [...prev, id]);
    showToast(
      isAr
        ? `تم تحويل مستحقات التاجر (${formatMoney(netAmount)}) بنجاح`
        : `Virement net de ${formatMoney(netAmount)} validé pour ${merchant}`,
      'success'
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold shadow-sm border border-orange-100 dark:border-orange-900/30">
            <CreditCard size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 dark:text-white">
              {isAr ? 'تحصيل COD ومستحقات التجار' : 'Caisse COD & Règlements E-Commerçants'}
            </h1>
            <p className="text-xs text-neutral-500">
              {isAr
                ? 'مطابقة مبالغ الدفع عند الاستلام، اقتطاع رسوم التوصيل، وتحويل صافي المستحقات'
                : 'Rapprochement des encaissements à la livraison et génération des virements marchands'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={isAr ? 'بحث بالتاجر، الكود...' : 'Rechercher marchand, code...'}
          />
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/40 dark:bg-neutral-900/40">
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <div className="text-neutral-500 text-xs font-medium">
            {isAr ? 'إجمالي COD المقبوض' : 'Total COD Encaissé'}
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">
            {formatMoney(totalCodCollected)}
          </div>
          <div className="text-[11px] text-neutral-400">
            {deliveredShipments.length} {isAr ? 'طرد مسلم' : 'colis livrés'}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <div className="text-neutral-500 text-xs font-medium">
            {isAr ? 'رسوم الشحن المقتطعة' : 'Frais de Livraison Retenus'}
          </div>
          <div className="text-2xl font-bold font-mono text-[#C4785A]">
            {formatMoney(totalShippingFees)}
          </div>
          <div className="text-[11px] text-[#C4785A]">
            {isAr ? 'مداخيل شركة التوصيل' : 'Revenu net agence express'}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-1">
          <div className="text-neutral-500 text-xs font-medium">
            {isAr ? 'صافي مستحقات المتاجر' : 'Net à Reverser aux Marchands'}
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600">
            {formatMoney(totalNetToMerchants)}
          </div>
          <div className="text-[11px] text-neutral-400">
            {isAr ? 'جاهز للتحويل (CCP / Dahabia)' : 'Bordereaux de virement prêts'}
          </div>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        <h3 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Building2 size={15} className="text-[#C4785A]" />
          <span>{isAr ? 'أوامر تسوية حسابات المتاجر' : 'Détail des Règlements par Colis'}</span>
        </h3>

        {filteredShipments.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800">
            <DollarSign size={32} className="text-neutral-300 dark:text-neutral-700 mb-1" />
            <p className="text-xs font-medium text-neutral-500">
              {isAr ? 'لا توجد شحنات مسلمة مسجلة' : 'Aucun colis livré dans cette sélection'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredShipments.map((s) => {
                const net = s.codAmountDzd - s.shippingFeeDzd;
                const isSettled = settledIds.includes(s.id);

                return (
                  <div
                    key={s.id}
                    className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-neutral-900 dark:text-white">
                          {s.merchantName}
                        </span>
                        <span className="font-mono text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded">
                          {s.trackingCode}
                        </span>
                      </div>
                      <div className="text-neutral-500">
                        Destinataire: {s.recipientName} ({s.destinationWilaya})
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right font-mono text-xs">
                        <div className="text-[10px] text-neutral-400 uppercase">COD - Frais = Net</div>
                        <div>
                          <span className="font-semibold">{formatMoney(s.codAmountDzd)}</span>
                          <span className="text-neutral-400"> - </span>
                          <span className="text-red-500">{formatMoney(s.shippingFeeDzd)}</span>
                          <span className="text-neutral-400"> = </span>
                          <span className="font-bold text-emerald-600">{formatMoney(net)}</span>
                        </div>
                      </div>

                      {isSettled ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          <span>{isAr ? 'تم التحويل' : 'Viré'}</span>
                        </span>
                      ) : (
                        <AtriumButton
                          variant="primary"
                          size="sm"
                          onClick={() => handleSettle(s.id, s.merchantName, net)}
                          icon={<Send size={13} />}
                        >
                          {isAr ? 'تحويل للتاجر' : 'Virer Net'}
                        </AtriumButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

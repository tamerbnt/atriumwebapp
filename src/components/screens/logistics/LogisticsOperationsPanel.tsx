import React, { useMemo, useState } from 'react';
import {
  Fuel,
  FileSpreadsheet,
  Webhook,
  Truck,
  Package,
  ThermometerSnowflake,
  Ship,
  Wrench,
  Plus,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  LogisticsShipment,
  LogisticsVehicleLog,
  LogisticsMerchantFeeInvoice,
  LogisticsCarrierIntegration,
  LogisticsFreightWaybill,
  LogisticsMovingQuote,
  LogisticsColdChainLog,
  LogisticsCustomsDossier,
  LogisticsTowingDispatch,
} from '../../../types';
import {
  buildMerchantFeeInvoiceSummary,
  computeFreightWaybillTotals,
  computeMovingVolumeQuote,
  evaluateColdChainExcursion,
  computeCustomsDossierDuties,
  computeTowingDispatchQuote,
} from '../../../utils/logisticsDepth';
import { formatMoney } from '../../../utils/rules';
import { AtriumButton } from '../../ui/AtriumButton';
import { showToast } from '../../../services/store';

interface LogisticsOperationsPanelProps {
  language: string;
  shipments: LogisticsShipment[];
  vehicleLogs: LogisticsVehicleLog[];
  merchantFeeInvoices: LogisticsMerchantFeeInvoice[];
  carrierIntegrations: LogisticsCarrierIntegration[];
  freightWaybills: LogisticsFreightWaybill[];
  movingQuotes: LogisticsMovingQuote[];
  coldChainLogs: LogisticsColdChainLog[];
  customsDossiers: LogisticsCustomsDossier[];
  towingDispatches: LogisticsTowingDispatch[];
  onAddVehicleLog: (log: Omit<LogisticsVehicleLog, 'id'>) => void;
  onIssueMerchantInvoice: (params: { merchantName: string; periodLabel: string }) => void;
  onAddIntegration: (integ: Omit<LogisticsCarrierIntegration, 'id' | 'ordersImportedCount'>) => void;
  onToggleIntegration: (id: string) => void;
  onAddFreightWaybill: (wb: Omit<LogisticsFreightWaybill, 'id' | 'waybillNumber' | 'createdAt'>) => void;
  onAddMovingQuote: (q: Omit<LogisticsMovingQuote, 'id' | 'quoteNumber' | 'createdAt'>) => void;
  onAddColdChainLog: (log: Omit<LogisticsColdChainLog, 'id' | 'recordedAt'>) => void;
  onAddCustomsDossier: (dos: Omit<LogisticsCustomsDossier, 'id' | 'dossierNumber' | 'createdAt'>) => void;
  onAddTowingDispatch: (tow: Omit<LogisticsTowingDispatch, 'id' | 'dispatchNumber' | 'createdAt'>) => void;
}

type OpSection = 'fleet' | 'merchants' | 'freight' | 'moving' | 'coldchain' | 'customs_towing';

export const LogisticsOperationsPanel: React.FC<LogisticsOperationsPanelProps> = ({
  language,
  shipments,
  vehicleLogs,
  merchantFeeInvoices,
  carrierIntegrations,
  freightWaybills,
  movingQuotes,
  coldChainLogs,
  customsDossiers,
  towingDispatches,
  onAddVehicleLog,
  onIssueMerchantInvoice,
  onAddIntegration,
  onToggleIntegration,
  onAddFreightWaybill,
  onAddMovingQuote,
  onAddColdChainLog,
  onAddCustomsDossier,
  onAddTowingDispatch,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const [section, setSection] = useState<OpSection>('fleet');

  // Fleet Log state
  const [plate, setPlate] = useState('01452-120-16');
  const [logKind, setLogKind] = useState<LogisticsVehicleLog['logKind']>('Fuel');
  const [odometerKm, setOdometerKm] = useState('143200');
  const [liters, setLiters] = useState('55');
  const [costDzd, setCostDzd] = useState('3575');
  const [providerName, setProviderName] = useState('Station Naftal Alger');

  // Merchant Invoice + Webhook state
  const merchantNames = useMemo(
    () => Array.from(new Set(shipments.map((s) => s.merchantName).filter(Boolean))),
    [shipments]
  );
  const [selectedMerchant, setSelectedMerchant] = useState(merchantNames[0] || '');
  const [periodLabel, setPeriodLabel] = useState('2026-05');
  const [storeName, setStoreName] = useState('');
  const [platform, setPlatform] = useState<LogisticsCarrierIntegration['platform']>('WooCommerce');
  const [webhookUrl, setWebhookUrl] = useState('');

  // Freight state
  const [frtShipper, setFrtShipper] = useState('');
  const [frtConsignee, setFrtConsignee] = useState('');
  const [frtOrigin, setFrtOrigin] = useState('16 - Alger');
  const [frtDest, setFrtDest] = useState('31 - Oran');
  const [frtCargo, setFrtCargo] = useState('');
  const [frtDist, setFrtDist] = useState('420');
  const [frtTons, setFrtTons] = useState('12');
  const [frtRate, setFrtRate] = useState('150');

  // Moving state
  const [movClient, setMovClient] = useState('');
  const [movOrigin, setMovOrigin] = useState('');
  const [movDest, setMovDest] = useState('');
  const [movVol, setMovVol] = useState('22');
  const [movDist, setMovDist] = useState('30');
  const [movFloorOrigin, setMovFloorOrigin] = useState('3');
  const [movFloorDest, setMovFloorDest] = useState('2');
  const [movPacking, setMovPacking] = useState(true);

  // Cold Chain state
  const [coldPlate, setColdPlate] = useState('08821-121-16');
  const [coldCargo, setColdCargo] = useState('Produits Pharmaceutiques');
  const [coldTemp, setColdTemp] = useState('4.5');
  const [coldMin, setColdMin] = useState('2');
  const [coldMax, setColdMax] = useState('8');
  const [coldMinutes, setColdMinutes] = useState('0');

  // Customs & Towing state
  const [custImporter, setCustImporter] = useState('');
  const [custBl, setCustBl] = useState('');
  const [custPort, setCustPort] = useState('Port d’Alger');
  const [custHs, setCustHs] = useState('8471.30.00');
  const [custFob, setCustFob] = useState('2500000');
  const [custDuty, setCustDuty] = useState('15');

  const [towCaller, setTowCaller] = useState('');
  const [towPhone, setTowPhone] = useState('');
  const [towClass, setTowClass] = useState<LogisticsTowingDispatch['vehicleClass']>('VL');
  const [towPickup, setTowPickup] = useState('');
  const [towDropoff, setTowDropoff] = useState('');
  const [towDist, setTowDist] = useState('25');
  const [towNight, setTowNight] = useState(false);
  const [towWinch, setTowWinch] = useState(false);

  const invoicePreview = useMemo(
    () =>
      buildMerchantFeeInvoiceSummary({
        merchantName: selectedMerchant || merchantNames[0] || '',
        shipments,
        periodLabel,
      }),
    [selectedMerchant, merchantNames, shipments, periodLabel]
  );

  const freightPreview = useMemo(
    () =>
      computeFreightWaybillTotals({
        distanceKm: Number(frtDist) || 0,
        weightTons: Number(frtTons) || 0,
        ratePerKmDzd: Number(frtRate) || 0,
      }),
    [frtDist, frtTons, frtRate]
  );

  const movingPreview = useMemo(
    () =>
      computeMovingVolumeQuote({
        volumeM3: Number(movVol) || 1,
        ratePerM3Dzd: 3200,
        distanceKm: Number(movDist) || 0,
        originFloor: Number(movFloorOrigin) || 0,
        destinationFloor: Number(movFloorDest) || 0,
        hasElevatorOrigin: false,
        hasElevatorDest: false,
        packingIncluded: movPacking,
      }),
    [movVol, movDist, movFloorOrigin, movFloorDest, movPacking]
  );

  const coldPreview = useMemo(
    () =>
      evaluateColdChainExcursion({
        recordedTempC: Number(coldTemp) || 0,
        minAllowedTempC: Number(coldMin) || 0,
        maxAllowedTempC: Number(coldMax) || 0,
        excursionMinutes: Number(coldMinutes) || 0,
      }),
    [coldTemp, coldMin, coldMax, coldMinutes]
  );

  const customsPreview = useMemo(
    () =>
      computeCustomsDossierDuties({
        fobValueDzd: Number(custFob) || 0,
        freightDzd: 180000,
        insuranceDzd: 25000,
        customsDutyRatePercent: Number(custDuty) || 0,
      }),
    [custFob, custDuty]
  );

  const towingPreview = useMemo(
    () =>
      computeTowingDispatchQuote({
        vehicleClass: towClass,
        distanceKm: Number(towDist) || 0,
        isNightOrWeekend: towNight,
        needsWinchExtraction: towWinch,
      }),
    [towClass, towDist, towNight, towWinch]
  );

  const navButtons: Array<{ id: OpSection; label: string; icon: React.ReactNode }> = [
    { id: 'fleet', label: isAr ? 'الأسطول والوقود' : isEn ? 'Fleet & Fuel' : 'Flotte & Carburant', icon: <Fuel className="w-3.5 h-3.5" /> },
    { id: 'merchants', label: isAr ? 'التجار و API' : isEn ? 'Merchant SCF & Webhooks' : 'Factures Marchands & API', icon: <Webhook className="w-3.5 h-3.5" /> },
    { id: 'freight', label: isAr ? 'نقل البضائع LTL/FTL' : isEn ? 'Freight Waybills' : 'Fret & LTL/FTL', icon: <Truck className="w-3.5 h-3.5" /> },
    { id: 'moving', label: isAr ? 'النقل والتأثيث m³' : isEn ? 'Moving m³' : 'Déménagement m³', icon: <Package className="w-3.5 h-3.5" /> },
    { id: 'coldchain', label: isAr ? 'سلسلة التبريد' : isEn ? 'Cold Chain' : 'Chaîne du Froid', icon: <ThermometerSnowflake className="w-3.5 h-3.5" /> },
    { id: 'customs_towing', label: isAr ? 'الجمارك والقطر' : isEn ? 'Customs D10 & Towing' : 'Douane D10 & Dépannage', icon: <Ship className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap gap-2">
        {navButtons.map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => setSection(btn.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--rad-ctl)] t-cap font-semibold border transition-colors ${
              section === btn.id
                ? 'bg-[var(--brand-text,#BF431F)] text-white border-transparent'
                : 'bg-white dark:bg-[#22201E] text-[var(--text-2)] dark:text-white/75 border-[var(--atr-divider)] hover:bg-black/5'
            }`}
          >
            {btn.icon}
            <span>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* 1. FLEET & FUEL */}
      {section === 'fleet' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!plate.trim()) return;
              onAddVehicleLog({
                vehiclePlate: plate.trim(),
                logKind,
                odometerKm: Number(odometerKm) || 0,
                liters: Number(liters) || 0,
                costDzd: Number(costDzd) || 0,
                providerName: providerName.trim() || undefined,
                loggedAt: new Date().toISOString().slice(0, 10),
              });
              showToast(isAr ? 'تم تسجيل مصروف الأسطول' : 'Journal véhicule enregistré', 'success');
            }}
            className="p-4 bg-white dark:bg-[#22201E] border border-[var(--atr-divider)] rounded-[var(--rad-card)] space-y-3"
          >
            <h3 className="t-label font-semibold flex items-center gap-2">
              <Fuel className="w-4 h-4 text-[var(--brand-text,#BF431F)]" />
              <span>{isAr ? 'تسجيل وقود / صيانة مركبة' : isEn ? 'Add Fuel / Maintenance Log' : 'Saisir Plein Carburant / Entretien'}</span>
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="block">
                <span className="t-cap text-[var(--text-3)]">Matricule</span>
                <input type="text" value={plate} onChange={(e) => setPlate(e.target.value)} required className="mt-1 w-full rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              </label>
              <label className="block">
                <span className="t-cap text-[var(--text-3)]">Nature</span>
                <select value={logKind} onChange={(e) => setLogKind(e.target.value as LogisticsVehicleLog['logKind'])} className="mt-1 w-full rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-white dark:bg-[#181614]">
                  <option value="Fuel">Carburant</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Insurance">Assurance</option>
                  <option value="Toll">Péage Autoroute</option>
                </select>
              </label>
              <label className="block">
                <span className="t-cap text-[var(--text-3)]">Compteur (km)</span>
                <input type="number" min="0" value={odometerKm} onChange={(e) => setOdometerKm(e.target.value)} className="mt-1 w-full rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              </label>
              <label className="block">
                <span className="t-cap text-[var(--text-3)]">Litres (L)</span>
                <input type="number" min="0" step="0.1" value={liters} onChange={(e) => setLiters(e.target.value)} className="mt-1 w-full rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              </label>
              <label className="block">
                <span className="t-cap text-[var(--text-3)]">Montant (DZD)</span>
                <input type="number" min="0" value={costDzd} onChange={(e) => setCostDzd(e.target.value)} className="mt-1 w-full rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              </label>
              <label className="block">
                <span className="t-cap text-[var(--text-3)]">Station / Garage</span>
                <input type="text" value={providerName} onChange={(e) => setProviderName(e.target.value)} className="mt-1 w-full rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              </label>
            </div>
            <AtriumButton type="submit" variant="primary" size="sm">
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'إضافة للسجل' : isEn ? 'Save Vehicle Log' : 'Enregistrer Frais Flotte'}</span>
            </AtriumButton>
          </form>

          <div className="p-4 bg-white dark:bg-[#22201E] border border-[var(--atr-divider)] rounded-[var(--rad-card)] space-y-2.5">
            <h3 className="t-label font-semibold">{isAr ? 'سجلات الأسطول' : isEn ? 'Fleet History' : 'Historique Coûts Flotte'} ({vehicleLogs.length})</h3>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {vehicleLogs.map((v) => (
                <div key={v.id} className="p-2.5 rounded-[var(--rad-ctl)] bg-[#F5F1EC] dark:bg-[#171513] flex items-center justify-between gap-2 t-cap">
                  <div>
                    <div className="font-semibold text-[var(--text-1)] dark:text-white">{v.vehiclePlate} · {v.logKind}</div>
                    <div className="text-[var(--text-3)]">{v.odometerKm.toLocaleString()} km · {v.liters > 0 ? `${v.liters} L · ` : ''}{v.providerName || '—'}</div>
                  </div>
                  <div className="tabular-nums font-semibold text-[var(--brand-text,#BF431F)]">{formatMoney(v.costDzd, language)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. MERCHANT FEE INVOICE (SCF) & WEBHOOKS */}
      {section === 'merchants' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 bg-white dark:bg-[#22201E] border border-[var(--atr-divider)] rounded-[var(--rad-card)] space-y-3">
            <h3 className="t-label font-semibold flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[var(--brand-text,#BF431F)]" />
              <span>{isAr ? 'فاتورة رسوم التاجر والربط المحاسبي SCF' : isEn ? 'Merchant Fee Invoice (SCF)' : 'Facture Frais Marchand & Écritures SCF'}</span>
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="block">
                <span className="t-cap text-[var(--text-3)]">Marchand E-Commerce</span>
                <select
                  value={selectedMerchant || merchantNames[0] || ''}
                  onChange={(e) => setSelectedMerchant(e.target.value)}
                  className="mt-1 w-full rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-white dark:bg-[#181614]"
                >
                  <option value="">Tous Marchands</option>
                  {merchantNames.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="t-cap text-[var(--text-3)]">Période</span>
                <input type="text" value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} className="mt-1 w-full rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              </label>
            </div>
            <div className="p-3 rounded-[var(--rad-ctl)] bg-[#F5F1EC] dark:bg-[#171513] space-y-1.5 t-cap">
              <div className="flex justify-between"><span>COD Brut ({invoicePreview.deliveredCount} livrés)</span><span className="font-semibold tabular-nums">{formatMoney(invoicePreview.grossCodDzd, language)}</span></div>
              <div className="flex justify-between"><span>Frais Livraison + Retours HT + TVA 19%</span><span className="font-semibold tabular-nums text-red-600">-{formatMoney(invoicePreview.totalFeesTtcDzd, language)}</span></div>
              <div className="flex justify-between font-semibold border-t border-[var(--atr-divider)] pt-1.5"><span>Net à Payer Marchand</span><span className="tabular-nums text-emerald-600">{formatMoney(invoicePreview.netMerchantPayableDzd, language)}</span></div>
              <div className="pt-1 space-y-0.5 text-[11px] font-mono text-[var(--text-3)]">
                {invoicePreview.scfLines.map((ln) => (
                  <div key={ln.accountCode} className="flex justify-between">
                    <span>SCF {ln.accountCode} · {ln.label}</span>
                    <span>D: {ln.debitDzd.toLocaleString()} / C: {ln.creditDzd.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <AtriumButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                onIssueMerchantInvoice({ merchantName: selectedMerchant || merchantNames[0] || '', periodLabel });
                showToast(isAr ? 'تم إصدار فاتورة التاجر' : 'Facture frais marchand générée', 'success');
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'إصدار وحفظ الفاتورة' : isEn ? 'Issue SCF Fee Invoice' : 'Émettre Facture Marchand'}</span>
            </AtriumButton>
            {merchantFeeInvoices.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {merchantFeeInvoices.slice(0, 3).map((inv) => (
                  <div key={inv.id} className="p-2 rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] flex justify-between t-cap">
                    <span><strong>{inv.invoiceNumber}</strong> · {inv.merchantName} ({inv.periodLabel})</span>
                    <span className="tabular-nums font-semibold">{formatMoney(inv.totalFeesTtcDzd, language)} TTC</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-white dark:bg-[#22201E] border border-[var(--atr-divider)] rounded-[var(--rad-card)] space-y-3">
            <h3 className="t-label font-semibold flex items-center gap-2">
              <Webhook className="w-4 h-4 text-[var(--brand-text,#BF431F)]" />
              <span>{isAr ? 'ربط متاجر التجارة الإلكترونية (Webhook)' : isEn ? 'E-Commerce Store Webhooks' : 'Webhooks E-Commerce (Shopify / WooCommerce / YouCan)'}</span>
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!storeName.trim() || !webhookUrl.trim()) return;
                onAddIntegration({
                  storeName: storeName.trim(),
                  platform,
                  webhookUrl: webhookUrl.trim(),
                  isActive: true,
                });
                setStoreName('');
                setWebhookUrl('');
                showToast(isAr ? 'تمت إضافة رابط Webhook' : 'Webhook boutique configuré', 'success');
              }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-2"
            >
              <input type="text" placeholder="Boutique" value={storeName} onChange={(e) => setStoreName(e.target.value)} required className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <select value={platform} onChange={(e) => setPlatform(e.target.value as LogisticsCarrierIntegration['platform'])} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-white dark:bg-[#181614]">
                <option value="WooCommerce">WooCommerce</option>
                <option value="Shopify">Shopify</option>
                <option value="YouCan">YouCan</option>
                <option value="CustomAPI">Custom REST API</option>
              </select>
              <input type="url" placeholder="https://..." value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} required className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <AtriumButton type="submit" variant="secondary" size="sm" className="sm:col-span-3">
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? 'ربط متجر جديد' : isEn ? 'Add Webhook Bridge' : 'Connecter Boutique Webhook'}</span>
              </AtriumButton>
            </form>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {carrierIntegrations.map((c) => (
                <div key={c.id} className="p-2.5 rounded-[var(--rad-ctl)] bg-[#F5F1EC] dark:bg-[#171513] flex items-center justify-between gap-2 t-cap">
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--text-1)] dark:text-white truncate">{c.storeName} · {c.platform}</div>
                    <div className="text-[var(--text-3)] truncate font-mono text-[11px]">{c.webhookUrl} ({c.ordersImportedCount} cmd)</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleIntegration(c.id)}
                    className={`px-2.5 py-1 rounded-[var(--rad-ctl)] text-xs font-semibold shrink-0 ${
                      c.isActive ? 'bg-emerald-600 text-white' : 'bg-zinc-300 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    {c.isActive ? 'Actif' : 'Pause'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. FREIGHT WAYBILLS [trade gap] */}
      {section === 'freight' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!frtShipper.trim() || !frtConsignee.trim()) return;
              onAddFreightWaybill({
                shipperName: frtShipper.trim(),
                consigneeName: frtConsignee.trim(),
                originWilaya: frtOrigin,
                destinationWilaya: frtDest,
                cargoDescription: frtCargo.trim() || 'Marchandise palettisée',
                weightTons: Number(frtTons) || 1,
                distanceKm: Number(frtDist) || 100,
                ratePerKmDzd: Number(frtRate) || 120,
                fuelSurchargePercent: 8,
                loadingFeeDzd: 4000,
                totalTtcDzd: freightPreview.totalTtcDzd,
                status: 'Scheduled',
              });
              setFrtShipper('');
              setFrtConsignee('');
              setFrtCargo('');
              showToast(isAr ? 'تم إنشاء بوليصة الشحن الثقيل' : 'Lettre de voiture FRT enregistrée', 'success');
            }}
            className="p-4 bg-white dark:bg-[#22201E] border border-[var(--atr-divider)] rounded-[var(--rad-card)] space-y-3"
          >
            <h3 className="t-label font-semibold">Lettre de Voiture Fret / Transport Lourd (FTL/LTL)</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <input type="text" placeholder="Chargeur / Expéditeur" value={frtShipper} onChange={(e) => setFrtShipper(e.target.value)} required className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="text" placeholder="Destinataire" value={frtConsignee} onChange={(e) => setFrtConsignee(e.target.value)} required className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="text" placeholder="Wilaya départ" value={frtOrigin} onChange={(e) => setFrtOrigin(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="text" placeholder="Wilaya arrivée" value={frtDest} onChange={(e) => setFrtDest(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="number" min="1" placeholder="Distance km" value={frtDist} onChange={(e) => setFrtDist(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="number" min="0.5" step="0.5" placeholder="Tonnage (T)" value={frtTons} onChange={(e) => setFrtTons(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="number" min="10" placeholder="Tarif/km DZD" value={frtRate} onChange={(e) => setFrtRate(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="text" placeholder="Nature cargaison" value={frtCargo} onChange={(e) => setFrtCargo(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
            </div>
            <div className="p-2.5 rounded-[var(--rad-ctl)] bg-[#F5F1EC] dark:bg-[#171513] flex justify-between t-cap">
              <span>Total TTC (incl. gasoil 8% + TVA 19%)</span>
              <span className="font-semibold tabular-nums text-[var(--brand-text,#BF431F)]">{formatMoney(freightPreview.totalTtcDzd, language)}</span>
            </div>
            <AtriumButton type="submit" variant="primary" size="sm">
              <Plus className="w-3.5 h-3.5" />
              <span>Émettre Lettre de Voiture FRT</span>
            </AtriumButton>
          </form>

          <div className="p-4 bg-white dark:bg-[#22201E] border border-[var(--atr-divider)] rounded-[var(--rad-card)] space-y-2.5">
            <h3 className="t-label font-semibold">Ordres Fret Lourd ({freightWaybills.length})</h3>
            {freightWaybills.map((wb) => (
              <div key={wb.id} className="p-3 rounded-[var(--rad-ctl)] bg-[#F5F1EC] dark:bg-[#171513] flex justify-between gap-2 t-cap">
                <div>
                  <div className="font-semibold">{wb.waybillNumber} · {wb.shipperName} → {wb.consigneeName}</div>
                  <div className="text-[var(--text-3)]">{wb.originWilaya} → {wb.destinationWilaya} · {wb.weightTons}T · {wb.distanceKm} km</div>
                </div>
                <div className="font-semibold tabular-nums">{formatMoney(wb.totalTtcDzd, language)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. MOVING & RELOCATION [trade gap] */}
      {section === 'moving' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!movClient.trim()) return;
              onAddMovingQuote({
                clientName: movClient.trim(),
                originAddress: movOrigin.trim() || 'Alger Centre',
                destinationAddress: movDest.trim() || 'Hydra',
                volumeM3: Number(movVol) || 15,
                distanceKm: Number(movDist) || 20,
                originFloor: Number(movFloorOrigin) || 0,
                destinationFloor: Number(movFloorDest) || 0,
                hasElevatorOrigin: false,
                hasElevatorDest: false,
                packingIncluded: movPacking,
                crewSize: 4,
                totalTtcDzd: movingPreview.totalTtcDzd,
                status: 'Quoted',
              });
              setMovClient('');
              showToast('Devis déménagement m³ enregistré', 'success');
            }}
            className="p-4 bg-white dark:bg-[#22201E] border border-[var(--atr-divider)] rounded-[var(--rad-card)] space-y-3"
          >
            <h3 className="t-label font-semibold">Calculateur Devis Déménagement (Cubage m³ & Étages)</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <input type="text" placeholder="Client / Société" value={movClient} onChange={(e) => setMovClient(e.target.value)} required className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="number" min="1" placeholder="Volume m³" value={movVol} onChange={(e) => setMovVol(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="text" placeholder="Adresse départ" value={movOrigin} onChange={(e) => setMovOrigin(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="text" placeholder="Adresse arrivée" value={movDest} onChange={(e) => setMovDest(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="number" min="0" placeholder="Étage départ" value={movFloorOrigin} onChange={(e) => setMovFloorOrigin(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="number" min="0" placeholder="Étage arrivée" value={movFloorDest} onChange={(e) => setMovFloorDest(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="number" min="0" placeholder="Distance km" value={movDist} onChange={(e) => setMovDist(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <label className="flex items-center gap-2 t-cap">
                <input type="checkbox" checked={movPacking} onChange={(e) => setMovPacking(e.target.checked)} />
                <span>Emballage & Cartons inclus</span>
              </label>
            </div>
            <div className="p-2.5 rounded-[var(--rad-ctl)] bg-[#F5F1EC] dark:bg-[#171513] flex justify-between t-cap">
              <span>Devis TTC (Portage +{formatMoney(movingPreview.stairSurchargeDzd, language)})</span>
              <span className="font-semibold tabular-nums text-[var(--brand-text,#BF431F)]">{formatMoney(movingPreview.totalTtcDzd, language)}</span>
            </div>
            <AtriumButton type="submit" variant="primary" size="sm">
              <Plus className="w-3.5 h-3.5" />
              <span>Créer Devis Déménagement</span>
            </AtriumButton>
          </form>

          <div className="p-4 bg-white dark:bg-[#22201E] border border-[var(--atr-divider)] rounded-[var(--rad-card)] space-y-2.5">
            <h3 className="t-label font-semibold">Devis Déménagement ({movingQuotes.length})</h3>
            {movingQuotes.map((q) => (
              <div key={q.id} className="p-3 rounded-[var(--rad-ctl)] bg-[#F5F1EC] dark:bg-[#171513] flex justify-between gap-2 t-cap">
                <div>
                  <div className="font-semibold">{q.quoteNumber} · {q.clientName}</div>
                  <div className="text-[var(--text-3)]">{q.volumeM3} m³ · {q.distanceKm} km · {q.originAddress} → {q.destinationAddress}</div>
                </div>
                <div className="font-semibold tabular-nums">{formatMoney(q.totalTtcDzd, language)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. COLD CHAIN [trade gap] */}
      {section === 'coldchain' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onAddColdChainLog({
                vehiclePlate: coldPlate.trim() || '08821-121-16',
                cargoType: coldCargo.trim() || 'Frais',
                recordedTempC: Number(coldTemp) || 0,
                minAllowedTempC: Number(coldMin) || 2,
                maxAllowedTempC: Number(coldMax) || 8,
                excursionMinutes: Number(coldMinutes) || 0,
                complianceStatus: coldPreview.status,
                requiresQuarantine: coldPreview.requiresQuarantine,
              });
              showToast(
                coldPreview.requiresQuarantine ? 'ALERTE RUPTURE CHAÎNE FROID' : 'Relevé thermique conforme enregistré',
                coldPreview.requiresQuarantine ? 'error' : 'success'
              );
            }}
            className="p-4 bg-white dark:bg-[#22201E] border border-[var(--atr-divider)] rounded-[var(--rad-card)] space-y-3"
          >
            <h3 className="t-label font-semibold">Sonde Thermique & Conformité Chaîne du Froid</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <input type="text" placeholder="Camion Frigo" value={coldPlate} onChange={(e) => setColdPlate(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="text" placeholder="Cargaison sensible" value={coldCargo} onChange={(e) => setColdCargo(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <label className="block"><span className="t-cap text-[var(--text-3)]">Temp. relevée (°C)</span><input type="number" step="0.1" value={coldTemp} onChange={(e) => setColdTemp(e.target.value)} className="mt-1 w-full rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" /></label>
              <label className="block"><span className="t-cap text-[var(--text-3)]">Durée écart (min)</span><input type="number" min="0" value={coldMinutes} onChange={(e) => setColdMinutes(e.target.value)} className="mt-1 w-full rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" /></label>
              <label className="block"><span className="t-cap text-[var(--text-3)]">Min autorisé (°C)</span><input type="number" step="0.1" value={coldMin} onChange={(e) => setColdMin(e.target.value)} className="mt-1 w-full rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" /></label>
              <label className="block"><span className="t-cap text-[var(--text-3)]">Max autorisé (°C)</span><input type="number" step="0.1" value={coldMax} onChange={(e) => setColdMax(e.target.value)} className="mt-1 w-full rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" /></label>
            </div>
            <div className={`p-2.5 rounded-[var(--rad-ctl)] flex items-center gap-2 t-cap font-semibold ${coldPreview.requiresQuarantine ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'}`}>
              {coldPreview.requiresQuarantine ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Statut : {coldPreview.status} {coldPreview.requiresQuarantine ? '— QUARANTAINE REQUISE' : ''}</span>
            </div>
            <AtriumButton type="submit" variant="primary" size="sm">
              <Plus className="w-3.5 h-3.5" />
              <span>Enregistrer Relevé Thermique</span>
            </AtriumButton>
          </form>

          <div className="p-4 bg-white dark:bg-[#22201E] border border-[var(--atr-divider)] rounded-[var(--rad-card)] space-y-2.5">
            <h3 className="t-label font-semibold">Journal Sonde Froid ({coldChainLogs.length})</h3>
            {coldChainLogs.map((c) => (
              <div key={c.id} className="p-3 rounded-[var(--rad-ctl)] bg-[#F5F1EC] dark:bg-[#171513] flex justify-between gap-2 t-cap">
                <div>
                  <div className="font-semibold">{c.vehiclePlate} · {c.cargoType}</div>
                  <div className="text-[var(--text-3)]">Plage {c.minAllowedTempC}°C..{c.maxAllowedTempC}°C · Écart {c.excursionMinutes} min</div>
                </div>
                <span className={`font-semibold px-2 py-0.5 rounded ${c.complianceStatus === 'Breach' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {c.recordedTempC}°C · {c.complianceStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. CUSTOMS D10 & TOWING DISPATCH [trade gap] */}
      {section === 'customs_towing' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!custImporter.trim()) return;
              onAddCustomsDossier({
                importerName: custImporter.trim(),
                blAwbReference: custBl.trim() || 'BL-ALG-2026',
                portName: custPort,
                hsCode: custHs,
                fobValueDzd: Number(custFob) || 0,
                freightDzd: 180000,
                insuranceDzd: 25000,
                customsDutyRatePercent: Number(custDuty) || 0,
                totalPayableDzd: customsPreview.totalPayableDzd,
                status: 'Lodged',
              });
              setCustImporter('');
              showToast('Dossier transit douanier D10 créé', 'success');
            }}
            className="p-4 bg-white dark:bg-[#22201E] border border-[var(--atr-divider)] rounded-[var(--rad-card)] space-y-3"
          >
            <h3 className="t-label font-semibold flex items-center gap-2"><Ship className="w-4 h-4 text-[var(--brand-text,#BF431F)]" /><span>Transit Douane D10 (CIF + Droits & TVA)</span></h3>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Importateur" value={custImporter} onChange={(e) => setCustImporter(e.target.value)} required className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="text" placeholder="N° BL / LTA" value={custBl} onChange={(e) => setCustBl(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="text" placeholder="Port / Aéroport" value={custPort} onChange={(e) => setCustPort(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="text" placeholder="Position Tarifaire HS" value={custHs} onChange={(e) => setCustHs(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="number" min="0" placeholder="Valeur FOB DZD" value={custFob} onChange={(e) => setCustFob(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="number" min="0" max="60" placeholder="Taux DD %" value={custDuty} onChange={(e) => setCustDuty(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
            </div>
            <div className="p-2.5 rounded-[var(--rad-ctl)] bg-[#F5F1EC] dark:bg-[#171513] flex justify-between t-cap">
              <span>Total Droits + TVA + Honoraires Transit</span>
              <span className="font-semibold tabular-nums">{formatMoney(customsPreview.totalPayableDzd, language)}</span>
            </div>
            <AtriumButton type="submit" variant="primary" size="sm">
              <Plus className="w-3.5 h-3.5" />
              <span>Ouvrir Dossier D10</span>
            </AtriumButton>
            {customsDossiers.slice(0, 2).map((d) => (
              <div key={d.id} className="p-2 rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] flex justify-between t-cap">
                <span><strong>{d.dossierNumber}</strong> · {d.importerName} ({d.hsCode})</span>
                <span className="tabular-nums font-semibold">{formatMoney(d.totalPayableDzd, language)}</span>
              </div>
            ))}
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!towCaller.trim()) return;
              onAddTowingDispatch({
                callerName: towCaller.trim(),
                callerPhone: towPhone.trim() || '0550 00 00 00',
                vehicleClass: towClass,
                pickupLocation: towPickup.trim() || 'Autoroute Est-Ouest',
                dropoffLocation: towDropoff.trim() || 'Garage',
                distanceKm: Number(towDist) || 15,
                isNightOrWeekend: towNight,
                needsWinchExtraction: towWinch,
                totalDzd: towingPreview.totalDzd,
                status: 'Dispatched',
              });
              setTowCaller('');
              showToast('Mission remorquage TOW déclenchée', 'success');
            }}
            className="p-4 bg-white dark:bg-[#22201E] border border-[var(--atr-divider)] rounded-[var(--rad-card)] space-y-3"
          >
            <h3 className="t-label font-semibold flex items-center gap-2"><Wrench className="w-4 h-4 text-[var(--brand-text,#BF431F)]" /><span>Dispatch Dépannage & Remorquage</span></h3>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Conducteur demandeur" value={towCaller} onChange={(e) => setTowCaller(e.target.value)} required className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="text" placeholder="Téléphone" value={towPhone} onChange={(e) => setTowPhone(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <select value={towClass} onChange={(e) => setTowClass(e.target.value as LogisticsTowingDispatch['vehicleClass'])} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-white dark:bg-[#181614]">
                <option value="VL">Véhicule Léger (VL)</option>
                <option value="Utilitaire">Utilitaire / Fourgon</option>
                <option value="PoidsLourd">Poids Lourd</option>
              </select>
              <input type="number" min="1" placeholder="Distance km" value={towDist} onChange={(e) => setTowDist(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="text" placeholder="Lieu prise en charge" value={towPickup} onChange={(e) => setTowPickup(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <input type="text" placeholder="Destination garage" value={towDropoff} onChange={(e) => setTowDropoff(e.target.value)} className="rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] px-2.5 py-1.5 t-small bg-transparent" />
              <label className="flex items-center gap-1.5 t-cap"><input type="checkbox" checked={towNight} onChange={(e) => setTowNight(e.target.checked)} /><span>Nuit/Week-end (+25%)</span></label>
              <label className="flex items-center gap-1.5 t-cap"><input type="checkbox" checked={towWinch} onChange={(e) => setTowWinch(e.target.checked)} /><span>Treuil Fossé</span></label>
            </div>
            <div className="p-2.5 rounded-[var(--rad-ctl)] bg-[#F5F1EC] dark:bg-[#171513] flex justify-between t-cap">
              <span>Tarif Intervention</span>
              <span className="font-semibold tabular-nums">{formatMoney(towingPreview.totalDzd, language)}</span>
            </div>
            <AtriumButton type="submit" variant="primary" size="sm">
              <Plus className="w-3.5 h-3.5" />
              <span>Envoyer Dépanneuse TOW</span>
            </AtriumButton>
            {towingDispatches.slice(0, 2).map((t) => (
              <div key={t.id} className="p-2 rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] flex justify-between t-cap">
                <span><strong>{t.dispatchNumber}</strong> · {t.callerName} ({t.vehicleClass})</span>
                <span className="tabular-nums font-semibold">{formatMoney(t.totalDzd, language)}</span>
              </div>
            ))}
          </form>
        </div>
      )}
    </div>
  );
};

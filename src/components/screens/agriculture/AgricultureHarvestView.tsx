import React, { useState } from 'react';
import { Scale, Plus, Printer, Truck, DollarSign, CheckCircle2 } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useAgricultureData } from './agricultureData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AgriHarvestTicket } from '../../../types';

export const AgricultureHarvestView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';
  const { harvestTickets, parcels, addHarvestTicket } = useAgricultureData();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicketForPrint, setSelectedTicketForPrint] = useState<AgriHarvestTicket | null>(null);

  // Form states
  const [parcelId, setParcelId] = useState(parcels[0]?.id || 'parc_01');
  const [crop, setCrop] = useState('Tomates Maraîchères Calibre 1');
  const [vehiclePlate, setVehiclePlate] = useState('00142-126-16');
  const [driverName, setDriverName] = useState('Hakim Benziane');
  const [grossWeight, setGrossWeight] = useState('8000');
  const [tareWeight, setTareWeight] = useState('3200');
  const [cratesCount, setCratesCount] = useState('250');
  const [unitPrice, setUnitPrice] = useState('75');
  const [market, setMarket] = useState('Marché de Gros des Eucalyptus, Alger');

  const formatMoney = (amount: number) => {
    return `${amount.toLocaleString()} DZD`;
  };

  const filteredTickets = harvestTickets.filter((t) =>
    t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.cropDesignation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.destinationWholesaleMarket.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.driverName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const gross = parseFloat(grossWeight) || 0;
    const tare = parseFloat(tareWeight) || 0;
    const net = Math.max(0, gross - tare);
    const pricePerKg = parseFloat(unitPrice) || 0;
    const totalGross = net * pricePerKg;
    const feePct = 6;
    const feeAmount = (totalGross * feePct) / 100;
    const netPayout = totalGross - feeAmount;

    const newTicket: AgriHarvestTicket = {
      id: `pes_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      ticketNumber: `PES-2026-${String(harvestTickets.length + 20).padStart(3, '0')}`,
      parcelId,
      cropDesignation: crop.trim(),
      vehiclePlate: vehiclePlate.trim(),
      driverName: driverName.trim(),
      grossWeightKg: gross,
      tareWeightKg: tare,
      netWeightKg: net,
      cratesCount: parseInt(cratesCount, 10) || 0,
      unitPriceDzdPerKg: pricePerKg,
      totalGrossDzd: totalGross,
      mandataireFeePercent: feePct,
      netFarmPayoutDzd: netPayout,
      destinationWholesaleMarket: market.trim(),
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    addHarvestTicket(newTicket);
    setIsModalOpen(false);
    showToast(
      isAr ? 'تم تسجيل وصل الوزن العمومي (Pont-Bascule)' : 'Bon de pesage & expédition enregistré',
      'success'
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold shadow-sm border border-orange-100 dark:border-orange-900/30">
            <Scale size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>{isAr ? 'المحاصيل والوزن العمومي (Pont-Bascule)' : 'Récoltes & Pesage Poids Public (Pont-Bascule)'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
                {harvestTickets.length}
              </span>
            </h1>
            <p className="text-xs text-neutral-500">
              {isAr
                ? 'قياس الوزن الإجمالي والفارغ والصافي للشاحنات، ووصولات سوق الجملة'
                : 'Bons de pesage camion (brut / tare / net), cageots et expéditions mandataires'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={isAr ? 'بحث بالوصل، المحصول...' : 'Rechercher ticket, produit...'}
          />

          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={15} />}
          >
            {isAr ? 'تذكرة وزن جديدة' : 'Nouveau Bon de Pesage'}
          </AtriumButton>
        </div>
      </div>

      {/* Tickets List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {filteredTickets.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800">
            <Scale size={40} className="text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-medium text-neutral-500">
              {isAr ? 'لا توجد وصولات وزن مطابقة' : 'Aucun bon de pesage trouvé'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((t) => (
              <div
                key={t.id}
                className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-900/40">
                      {t.ticketNumber}
                    </span>
                    <span className="font-bold text-sm text-neutral-900 dark:text-white">
                      {t.cropDesignation}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">
                      ({t.vehiclePlate} · {t.driverName})
                    </span>
                  </div>

                  <div className="text-xs text-neutral-500 flex items-center gap-2">
                    <span>Marché: <strong className="text-neutral-800 dark:text-neutral-200">{t.destinationWholesaleMarket}</strong></span>
                    <span>·</span>
                    <span>{t.cratesCount} caisses</span>
                    <span>·</span>
                    <span>Date: {t.date}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                    <div className="bg-neutral-50 dark:bg-neutral-800/60 px-2.5 py-1.5 rounded-xl">
                      <div className="text-[10px] text-neutral-400">Poids Brut</div>
                      <div className="font-semibold text-neutral-700 dark:text-neutral-300">{t.grossWeightKg} kg</div>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-800/60 px-2.5 py-1.5 rounded-xl">
                      <div className="text-[10px] text-neutral-400">Tare Camion</div>
                      <div className="font-semibold text-neutral-700 dark:text-neutral-300">{t.tareWeightKg} kg</div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                      <div className="text-[10px] text-emerald-600 font-bold uppercase">Net Récolte</div>
                      <div className="font-bold text-emerald-600">{t.netWeightKg} kg</div>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs">
                    <div className="text-[10px] text-neutral-400 uppercase">Net Domaine</div>
                    <div className="font-bold text-[#C4785A]">
                      {formatMoney(t.netFarmPayoutDzd)}
                    </div>
                  </div>

                  <AtriumButton
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTicketForPrint(t)}
                    icon={<Printer size={13} />}
                  >
                    {isAr ? 'طباعة' : 'Imprimer'}
                  </AtriumButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Scale size={18} className="text-[#C4785A]" />
                <span>{isAr ? 'وصل وزن عمومي جديد (Pont-Bascule)' : 'Nouveau Bon de Pesage Camion'}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3">
              <LabelSelect
                label={isAr ? 'القطعة المنتجة' : 'Parcelle de Provenance'}
                value={parcelId}
                onChange={(e) => setParcelId(e.target.value)}
                options={parcels.map((p) => ({
                  value: p.id,
                  label: `${p.name} (${p.currentCrop})`,
                }))}
              />

              <LabelInput
                label={isAr ? 'المحصول المجني *' : 'Désignation de la Récolte *'}
                placeholder="Ex: Tomates Calibre 1"
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'ترقيم الشاحنة' : 'Matricule Véhicule'}
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                />
                <LabelInput
                  label={isAr ? 'اسم السائق' : 'Chauffeur'}
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'الوزن الإجمالي (Gross Kg)' : 'Poids Brut (Kg)'}
                  type="number"
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'وزن الشاحنة فارغة (Tare Kg)' : 'Tare Véhicule (Kg)'}
                  type="number"
                  value={tareWeight}
                  onChange={(e) => setTareWeight(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'عدد الصناديق' : 'Nombre de Caisses'}
                  type="number"
                  value={cratesCount}
                  onChange={(e) => setCratesCount(e.target.value)}
                />
                <LabelInput
                  label={isAr ? 'سعر الكيلوغرام المتوقع (دج)' : 'Prix Unitaire DZD / Kg'}
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                />
              </div>

              <LabelInput
                label={isAr ? 'سوق الجملة / الوجهة' : 'Marché de Gros Destinataire'}
                value={market}
                onChange={(e) => setMarket(e.target.value)}
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {isAr ? 'تأكيد الوزن' : 'Valider le Pesage'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {selectedTicketForPrint && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-300 text-neutral-900 space-y-4 font-mono text-xs">
            <div className="text-center border-b pb-3 space-y-1">
              <div className="font-extrabold text-base tracking-widest text-[#C4785A]">DOMAINE AGRICOLE ATRIUM</div>
              <div className="text-xs text-neutral-500">TICKET OFFICIEL DE PESAGE PONT-BASCULE</div>
              <div className="text-base font-bold mt-1">{selectedTicketForPrint.ticketNumber}</div>
            </div>

            <div className="space-y-2 border-b pb-3">
              <div className="flex justify-between">
                <span>Culture Expédiée:</span>
                <span className="font-bold">{selectedTicketForPrint.cropDesignation}</span>
              </div>
              <div className="flex justify-between">
                <span>Véhicule / Chauffeur:</span>
                <span>{selectedTicketForPrint.vehiclePlate} ({selectedTicketForPrint.driverName})</span>
              </div>
              <div className="flex justify-between">
                <span>Poids Brut:</span>
                <span>{selectedTicketForPrint.grossWeightKg} kg</span>
              </div>
              <div className="flex justify-between">
                <span>Tare Camion:</span>
                <span>-{selectedTicketForPrint.tareWeightKg} kg</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1 border-t text-emerald-700">
                <span>POIDS NET RÉCOLTE:</span>
                <span>{selectedTicketForPrint.netWeightKg} KG</span>
              </div>
              <div className="flex justify-between text-[#C4785A] font-bold">
                <span>Net Exploitation (après 6%):</span>
                <span>{formatMoney(selectedTicketForPrint.netFarmPayoutDzd)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <AtriumButton variant="ghost" size="sm" onClick={() => setSelectedTicketForPrint(null)}>
                Fermer
              </AtriumButton>
              <AtriumButton
                variant="primary"
                size="sm"
                onClick={() => {
                  window.print();
                  setSelectedTicketForPrint(null);
                }}
                icon={<Printer size={14} />}
              >
                Imprimer
              </AtriumButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

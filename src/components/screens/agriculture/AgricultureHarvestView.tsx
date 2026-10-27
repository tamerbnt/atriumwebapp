import React, { useState } from 'react';
import { Scale, Plus, Printer, Truck, DollarSign, CheckCircle2, X } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useAgricultureData } from './agricultureData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
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

  const filteredTickets = harvestTickets.filter((t) =>
    t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.cropDesignation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.destinationWholesaleMarket.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.driverName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalGrossKg = harvestTickets.reduce((acc, t) => acc + t.grossWeightKg, 0);
  const totalTareKg = harvestTickets.reduce((acc, t) => acc + t.tareWeightKg, 0);
  const totalNetKg = harvestTickets.reduce((acc, t) => acc + t.netWeightKg, 0);
  const totalNetPayout = harvestTickets.reduce((acc, t) => acc + t.netFarmPayoutDzd, 0);

  const parcelOptions = parcels.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.currentCrop})`,
  }));

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
      date: new Date().toISOString().split('T')[0],
      vehiclePlate: vehiclePlate.trim(),
      driverName: driverName.trim(),
      cropDesignation: crop.trim(),
      grossWeightKg: gross,
      tareWeightKg: tare,
      netWeightKg: net,
      cratesCount: parseInt(cratesCount, 10) || 0,
      unitPriceDzdPerKg: pricePerKg,
      totalGrossDzd: totalGross,
      mandataireFeePercent: feePct,
      netFarmPayoutDzd: netPayout,
      destinationWholesaleMarket: market.trim(),
      createdAt: new Date().toISOString(),
    };

    addHarvestTicket(newTicket);
    setIsModalOpen(false);
    showToast(
      isAr ? 'تم تسجيل وتأكيد وصل وزن المحصول' : 'Bon de pesée pont-bascule validé avec succès',
      'success'
    );
  };

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Scale size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'وصولات الوزن وجني المحاصيل' : 'Pesées & Bons de Récolte'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {harvestTickets.length} pesées
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'تسجيل الوزن بالقفان (الوزن الإجمالي، الفارغ والصافي)، والوجهة لأسواق الجملة'
                : 'Pesées contradictoires au pont-bascule, tare des camions et bons de livraison'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {isAr ? 'وصل وزن جديد' : 'Nouveau Bon de Pesée'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات الأوزان والشحن' : 'Tonnages Expédiés & Rapprochement Pont-Bascule'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr
              ? 'مجموع الأوزان المحققة، خصم وزن الشاحنات والصناديق ومحصول المزرعة الصافي'
              : 'Pesées brutes enregistrées, tares déduites et tonnages expédiés aux mandataires'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Poids Brut */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إجمالي الوزن الإجمالي (Brut)' : 'Poids Brut Enregistré'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {(totalGrossKg / 1000).toFixed(1)} <span className="text-sm font-sans font-normal text-neutral-500">Tonnes</span>
              </div>
              <p className="text-[11px] text-[#C4785A] mt-0.5 font-medium">
                {harvestTickets.length} {isAr ? 'شحنات موزونة' : 'passages sur pont-bascule'}
              </p>
            </div>
          </div>

          {/* Card 2: Tare */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'وزن الشاحنات والصناديق (Tare)' : 'Tare Cumulée Véhicules & Caisses'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {(totalTareKg / 1000).toFixed(1)} <span className="text-sm font-sans font-normal text-neutral-500">Tonnes</span>
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'خصم دقيق للمركبة' : 'Tare contrôlée à vide'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'الوزن الصافي المفوتر' : 'Poids Net Marchand'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Pont-Bascule
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {(totalNetKg / 1000).toFixed(1)} <span className="text-sm font-sans font-normal text-neutral-300">Tonnes Net</span>
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {formatMoney(totalNetPayout)} {isAr ? 'صافي مستحق' : 'net mandataire calculé'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Universal Collection Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'سجل وصولات وزن المحاصيل المشحونة' : 'Registre des Bons de Pesée au Pont-Bascule'}
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-mono">
              {filteredTickets.length}
            </span>
          </div>

          <div className="w-64">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={isAr ? 'بحث برقم الوصل، السائق...' : 'Rechercher ticket, chauffeur...'}
            />
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-[20px] border border-dashed border-neutral-300 dark:border-neutral-800">
            <Scale size={36} className="text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-medium text-neutral-500">
              {isAr ? 'لا توجد وصولات وزن مطابقة للبحث' : 'Aucun bon de pesée correspondant'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((t) => (
              <div
                key={t.id}
                className="bg-white dark:bg-neutral-900 p-5 rounded-[20px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-[#C4785A]/10 text-[#C4785A] px-2.5 py-1 rounded-lg border border-[#C4785A]/20">
                      {t.ticketNumber}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">
                      {t.date}
                    </span>
                    <span className="font-mono text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-neutral-600 dark:text-neutral-400">
                      {t.vehiclePlate}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    {t.cropDesignation}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 pt-0.5">
                    <span>Brut: <strong className="font-mono text-neutral-800 dark:text-neutral-200">{t.grossWeightKg.toLocaleString()} kg</strong></span>
                    <span>·</span>
                    <span>Tare: <strong className="font-mono text-amber-600">{t.tareWeightKg.toLocaleString()} kg</strong></span>
                    <span>·</span>
                    <span>Net: <strong className="font-mono text-emerald-600 font-bold">{t.netWeightKg.toLocaleString()} kg</strong></span>
                    <span>·</span>
                    <span>{t.cratesCount} caisses</span>
                  </div>

                  <p className="text-[11px] text-neutral-400">
                    Marché: {t.destinationWholesaleMarket} · Chauffeur: {t.driverName}
                  </p>
                </div>

                <div className="flex items-center justify-between lg:justify-end gap-5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-zinc-100 dark:border-zinc-800">
                  <div className="text-left lg:text-right">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-medium">
                      Net Mandataire (DZD)
                    </span>
                    <span className="text-base font-bold font-mono text-neutral-900 dark:text-white">
                      {formatMoney(t.netFarmPayoutDzd)}
                    </span>
                    <span className="text-[10px] text-neutral-400 block">
                      à {t.unitPriceDzdPerKg} DZD/kg (-6% com)
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedTicketForPrint(t)}
                    className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 transition-colors"
                    title="Imprimer le ticket de pesée"
                  >
                    <Printer size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Weigh Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 p-6 w-full max-w-lg shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Scale size={20} className="text-[#C4785A]" />
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  {isAr ? 'تسجيل وصل وزن بالقفان (Pont-Bascule)' : 'Nouveau Bon de Pesée Récolte'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <LabelSelect
                label={isAr ? 'القطعة المصدر' : 'Parcelle d\'Origine'}
                value={parcelId}
                onChange={setParcelId}
                options={parcelOptions}
              />

              <LabelInput
                label={isAr ? 'تعيين المحصول والصنف' : 'Désignation Récolte / Calibre'}
                value={crop}
                onChange={setCrop}
                placeholder="Ex: Tomates Maraîchères Calibre 1"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'ترقيم الشاحنة' : 'Matricule Véhicule'}
                  value={vehiclePlate}
                  onChange={setVehiclePlate}
                  placeholder="00142-126-16"
                  required
                />
                <LabelInput
                  label={isAr ? 'اسم السائق' : 'Nom du Chauffeur'}
                  value={driverName}
                  onChange={setDriverName}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <LabelInput
                  label={isAr ? 'الوزن الإجمالي (kg)' : 'Poids Brut (kg)'}
                  type="number"
                  value={grossWeight}
                  onChange={setGrossWeight}
                  required
                />
                <LabelInput
                  label={isAr ? 'الفارغ (kg)' : 'Tare (kg)'}
                  type="number"
                  value={tareWeight}
                  onChange={setTareWeight}
                  required
                />
                <LabelInput
                  label={isAr ? 'عدد الصناديق' : 'Nb Caisses'}
                  type="number"
                  value={cratesCount}
                  onChange={setCratesCount}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'السعر الأحادي (DZD/kg)' : 'Prix Unitaire DZD / kg'}
                  type="number"
                  value={unitPrice}
                  onChange={setUnitPrice}
                  required
                />
                <LabelInput
                  label={isAr ? 'سوق الجملة / الوكيل' : 'Marché / Mandataire'}
                  value={market}
                  onChange={setMarket}
                  required
                />
              </div>

              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Poids Net Calculé:</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-white">
                    {Math.max(0, (parseFloat(grossWeight) || 0) - (parseFloat(tareWeight) || 0)).toLocaleString()} kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Net Mandataire (après 6% com):</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {formatMoney(
                      Math.max(0, (parseFloat(grossWeight) || 0) - (parseFloat(tareWeight) || 0)) *
                        (parseFloat(unitPrice) || 0) *
                        0.94
                    )}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <AtriumButton variant="secondary" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" type="submit">
                  {isAr ? 'تأكيد وحفظ الوصل' : 'Valider la Pesée'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Weighing Ticket Modal */}
      {selectedTicketForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 p-6 w-full max-w-lg shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-[#C4785A]" />
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  Ticket Pont-Bascule #{selectedTicketForPrint.ticketNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTicketForPrint(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-2 text-xs font-mono">
              <div className="font-sans font-bold text-sm text-neutral-900 dark:text-white mb-2">
                {selectedTicketForPrint.cropDesignation}
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Camion:</span>
                <span>{selectedTicketForPrint.vehiclePlate} ({selectedTicketForPrint.driverName})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Poids Brut:</span>
                <span>{selectedTicketForPrint.grossWeightKg.toLocaleString()} kg</span>
              </div>
              <div className="flex justify-between text-amber-600">
                <span>Tare Déduite:</span>
                <span>-{selectedTicketForPrint.tareWeightKg.toLocaleString()} kg</span>
              </div>
              <div className="pt-1 border-t border-neutral-200 dark:border-neutral-700 flex justify-between font-bold text-emerald-600 text-sm">
                <span>POIDS NET:</span>
                <span>{selectedTicketForPrint.netWeightKg.toLocaleString()} kg</span>
              </div>
              <div className="flex justify-between pt-1 text-neutral-500">
                <span>Destination:</span>
                <span className="font-sans">{selectedTicketForPrint.destinationWholesaleMarket}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <AtriumButton variant="secondary" onClick={() => setSelectedTicketForPrint(null)}>
                Fermer
              </AtriumButton>
              <AtriumButton
                variant="primary"
                icon={<Printer size={14} />}
                onClick={() => {
                  window.print();
                  setSelectedTicketForPrint(null);
                }}
              >
                Imprimer le Ticket
              </AtriumButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

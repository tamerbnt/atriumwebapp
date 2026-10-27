import React, { useState } from 'react';
import { Truck, Plus, Printer, Users, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useLogisticsData } from './logisticsData';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LogisticsManifest } from '../../../types';

export const LogisticsManifestsView: React.FC = () => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isAr = language === 'ar';
  const { manifests, shipments, addManifest } = useLogisticsData();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('0550 12 34 56');
  const [vehiclePlate, setVehiclePlate] = useState('01452-120-16');
  const [zone, setZone] = useState('Alger Est & Centre');

  const formatMoney = (amount: number) => {
    return `${amount.toLocaleString()} DZD`;
  };

  const filteredManifests = manifests.filter((m) =>
    m.manifestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.zoneWilaya || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalParcelsInManifests = manifests.reduce((acc, m) => acc + (m.totalShipmentsCount || m.shipmentIds.length), 0);
  const totalCodInManifests = manifests.reduce((acc, m) => acc + (m.totalCodExpectedDzd || 0), 0);

  const handleCreateManifest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName.trim()) {
      showToast(isAr ? 'يرجى إدخال اسم السائق' : 'Veuillez saisir le nom du chauffeur', 'error');
      return;
    }

    const unassignedShipments = shipments.filter(
      (s) => s.status === 'ReceivedAtHub' || s.status === 'Sorted'
    );
    const count = unassignedShipments.length || 5;
    const codTotal = unassignedShipments.reduce((acc, s) => acc + s.codAmountDzd, 0) || 45000;

    const newManifest: LogisticsManifest = {
      id: `man_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_logistics',
      branchId: currentBranch?.id || 'branch_logistics_main',
      staffId: currentUser?.id || 'staff_01',
      manifestNumber: `MAN-2026-${String(manifests.length + 42).padStart(3, '0')}`,
      driverName: driverName.trim(),
      driverPhone: driverPhone.trim(),
      vehiclePlate: vehiclePlate.trim(),
      dispatchDate: new Date().toISOString().split('T')[0],
      zoneWilaya: zone.trim(),
      shipmentIds: unassignedShipments.map((s) => s.id),
      totalShipmentsCount: count,
      totalCodExpectedDzd: codTotal,
      totalCodCollectedDzd: 0,
      status: 'Dispatched',
      createdAt: new Date().toISOString(),
    };

    addManifest(newManifest);
    setIsModalOpen(false);
    showToast(
      isAr ? 'تم إنشاء ورقة طريق السائق بنجاح' : 'Feuille de route chauffeur émise avec succès',
      'success'
    );
  };

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Top Header Strip with Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-xs">
            <Truck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {isAr ? 'أوراق الإرسال ومسارات الشاحنات' : 'Manifestes de Dispatch & Feuilles de Route'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C4785A]/15 text-[#C4785A]">
                {manifests.length} manifestes
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isAr
                ? 'تنظيم رحلات التوزيع، تعيين السائقين، وجرد الطرود المحملة لكل مسار'
                : 'Bordereaux de chargement camion, assignation des coursiers & validation des tournées'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={14} />}
          >
            {isAr ? 'مسار جديد' : 'Nouvelle Tournée'}
          </AtriumButton>
        </div>
      </div>

      {/* Canonical 3-Card Top Metrics Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {isAr ? 'مؤشرات مسارات التوزيع والشاحنات' : 'Dispatch des Camions & Tournées de Livraison'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isAr ? 'متابعة أوراق الإرسال، عدد الطرود المحملة وإجمالي مبالغ COD المسندة للسائقين' : 'Tournées déployées, colis en cours de distribution et engagement financier'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Manifestes créés */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'أوراق الإرسال النشطة' : 'Feuilles de Route Actives'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono tabular-nums">
                {manifests.length}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {isAr ? 'مركبات في الخدمة' : 'Véhicules sur le terrain'}
              </p>
            </div>
          </div>

          {/* Card 2: Colis confiés */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex flex-col justify-between h-[124px] shadow-2xs">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {isAr ? 'إجمالي الطرود المسندة' : 'Colis en Tournée'}
            </span>
            <div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {totalParcelsInManifests}
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                {isAr ? 'موزعة على كافة المناطق' : 'Répartis sur les wilayas'}
              </p>
            </div>
          </div>

          {/* Card 3: Dark Espresso Anchor Card */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {isAr ? 'أموال COD المسندة للعهدة' : 'Masse COD en Tournée'}
              </span>
              <span className="bg-[#3D2817] text-[#FB923C] rounded-full px-2 py-0.5 text-[10px] font-bold">
                Engagement
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-white font-mono tabular-nums">
                {formatMoney(totalCodInManifests)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <CheckCircle2 size={11} />
                {filteredManifests.length} {isAr ? 'مسار معروض' : 'manifestes listés'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Workstation Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Integrated Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {isAr ? 'سجل رحلات التوزيع' : 'Bordereaux de Route Chauffeurs'}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-[#E9EEF0] dark:bg-neutral-700 rounded-full text-neutral-700 dark:text-neutral-300">
              {filteredManifests.length}
            </span>
          </div>

          <div className="w-full sm:w-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={isAr ? 'بحث بالمسار، السائق، المنطقة...' : 'Recherche manifeste, chauffeur, zone...'}
            />
          </div>
        </div>

        {/* Manifests Cards Container */}
        <div className="space-y-3">
          {filteredManifests.map((m) => (
            <div
              key={m.id}
              className="p-5 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-[#C4785A] bg-[#C4785A]/10 px-2.5 py-0.5 rounded-full">
                    {m.manifestNumber}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                    {m.zoneWilaya}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {m.status}
                  </span>
                </div>
                <div className="text-sm font-bold text-neutral-900 dark:text-white">
                  {m.driverName} • <span className="font-mono font-normal text-xs text-neutral-500">{m.driverPhone}</span>
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {isAr ? 'المركبة' : 'Véhicule'}: <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-300">{m.vehiclePlate}</span> • {isAr ? 'التاريخ' : 'Date'}: {m.dispatchDate}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-neutral-100 dark:border-neutral-700">
                <div className="text-right rtl:text-left">
                  <div className="text-[10px] font-semibold text-neutral-400 uppercase">
                    {m.totalShipmentsCount || m.shipmentIds.length} {isAr ? 'طرد' : 'colis'}
                  </div>
                  <div className="font-mono font-bold text-sm text-[#C4785A]">
                    {formatMoney(m.totalCodExpectedDzd || 0)}
                  </div>
                </div>

                <AtriumButton
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    window.print();
                    showToast('Impression de la feuille de route lancée', 'success');
                  }}
                  icon={<Printer size={13} />}
                >
                  {isAr ? 'طباعة' : 'Imprimer'}
                </AtriumButton>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Manifest Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Truck size={18} className="text-[#C4785A]" />
                <span>{isAr ? 'إنشاء مسار توصيل جديد' : 'Nouvelle Tournée Chauffeur'}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManifest} className="space-y-3">
              <LabelInput
                label={isAr ? 'اسم السائق *' : 'Nom du Chauffeur *'}
                placeholder="Ex: Farid Mehdi"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                required
              />

              <LabelInput
                label={isAr ? 'رقم هاتف السائق' : 'Téléphone Chauffeur'}
                placeholder="0550 00 00 00"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
              />

              <LabelInput
                label={isAr ? 'ترقيم المركبة' : 'Matricule Véhicule'}
                placeholder="01452-120-16"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
              />

              <LabelSelect
                label={isAr ? 'منطقة التوزيع' : 'Zone de Distribution'}
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                options={[
                  { value: 'Alger Est & Centre', label: 'Alger Est & Centre' },
                  { value: 'Alger Ouest (Draria, Cheraga)', label: 'Alger Ouest (Draria, Cheraga)' },
                  { value: 'Blida & Mitidja', label: 'Blida & Mitidja' },
                  { value: 'Boumerdes & Banlieue', label: 'Boumerdes & Banlieue' },
                ]}
              />

              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl text-xs text-neutral-600 dark:text-neutral-400">
                <p>
                  {isAr
                    ? 'سيتم تجميع كافة الطرود المفروزة لهذه المنطقة تلقائياً ضمن ورقة الإرسال.'
                    : 'Les colis en attente de tri pour ce secteur seront automatiquement attachés au manifeste.'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {isAr ? 'تأكيد وإصدار' : 'Éditer la Feuille'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

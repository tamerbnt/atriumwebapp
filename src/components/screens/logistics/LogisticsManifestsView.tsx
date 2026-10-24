import React, { useState } from 'react';
import { Truck, Plus, Printer, Users, FileText, CheckCircle } from 'lucide-react';
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
    setDriverName('');
    showToast(
      isAr ? 'تم إنشاء مسار التوزيع وتسليم الطرود للسائق' : 'Feuille de route générée avec succès',
      'success'
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] flex items-center justify-center font-bold shadow-sm border border-orange-100 dark:border-orange-900/30">
            <Truck size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <span>{isAr ? 'مسارات التوزيع للسائقين (Tournées)' : 'Feuilles de Route Chauffeurs & Tournées'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
                {manifests.length}
              </span>
            </h1>
            <p className="text-xs text-neutral-500">
              {isAr
                ? 'تنظيم جولات التوصيل الميداني ومطابقة مبالغ الدفع عند الاستلام'
                : 'Affectation des colis par zone, décharges chauffeurs et suivi du COD terrain'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={isAr ? 'بحث بالسائق، المسار...' : 'Rechercher chauffeur, tournée...'}
          />

          <AtriumButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={15} />}
          >
            {isAr ? 'مسار جديد' : 'Nouvelle Tournée'}
          </AtriumButton>
        </div>
      </div>

      {/* Manifests List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {filteredManifests.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800">
            <Truck size={40} className="text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-medium text-neutral-500">
              {isAr ? 'لا توجد مسارات مطابقة' : 'Aucune tournée trouvée'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredManifests.map((m) => (
              <div
                key={m.id}
                className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-[#C4785A]/40 transition-all flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-orange-50 dark:bg-orange-950/40 text-[#C4785A] px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-900/40">
                      {m.manifestNumber}
                    </span>
                    <span className="font-bold text-sm text-neutral-900 dark:text-white">
                      {m.driverName}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">
                      ({m.driverPhone})
                    </span>
                  </div>

                  <div className="text-xs text-neutral-500 flex items-center gap-2">
                    <span>Zone: <strong className="text-neutral-800 dark:text-neutral-200">{m.zoneWilaya}</strong></span>
                    <span>·</span>
                    <span>Départ: {m.dispatchDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="grid grid-cols-2 gap-3 text-right font-mono text-xs">
                    <div className="bg-neutral-50 dark:bg-neutral-800/60 px-3 py-1.5 rounded-xl">
                      <div className="text-[10px] text-neutral-400">Colis assignés</div>
                      <div className="font-bold text-neutral-900 dark:text-white">{m.totalShipmentsCount} colis</div>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-800/60 px-3 py-1.5 rounded-xl">
                      <div className="text-[10px] text-neutral-400">COD Attendu</div>
                      <div className="font-bold text-emerald-600">{formatMoney(m.totalCodExpectedDzd)}</div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      m.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                    }`}
                  >
                    {m.status}
                  </span>

                  <AtriumButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.print();
                      showToast('Impression de la feuille de route lancée', 'success');
                    }}
                    icon={<Printer size={14} />}
                  >
                    {isAr ? 'طباعة المسار' : 'Imprimer'}
                  </AtriumButton>
                </div>
              </div>
            ))}
          </div>
        )}
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

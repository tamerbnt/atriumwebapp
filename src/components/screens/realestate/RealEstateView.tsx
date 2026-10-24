import React, { useState } from 'react';
import {
  Building2,
  Key,
  FileText,
  Users,
  CreditCard,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Home,
  MapPin,
  Calendar,
  Printer,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { formatMoney } from '../../../utils/rules';
import { RealEstateProperty, RealEstateLease } from '../../../types/index';

interface RealEstateViewProps {
  initialTab?: 'dashboard' | 'properties' | 'leases' | 'finance';
}

export const RealEstateView: React.FC<RealEstateViewProps> = ({ initialTab = 'dashboard' }) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'properties' | 'leases' | 'finance'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);

  const [properties, setProperties] = useState<RealEstateProperty[]>([
    {
      id: 'prop_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_realestate',
      branchId: currentBranch?.id || 'branch_realestate_main',
      staffId: currentUser?.id || 'staff_01',
      title: 'Appartement Haut Standing F4 Hydra',
      propertyType: 'Apartment',
      listingType: 'Rental',
      surfaceM2: 145,
      roomsCount: 4,
      address: 'Résidence Les Pins, Djenane El Malik, Hydra',
      cityWilaya: 'Hydra, Alger',
      priceDzd: 180000,
      ownerName: 'Kamel Boumaza',
      ownerPhone: '0550 11 22 33',
      status: 'Rented',
      amenities: ['Ascenseur', 'Garage souterrain', 'Chauffage central', 'Vue dégagée'],
      createdAt: '2026-05-10T08:00:00Z',
    },
    {
      id: 'prop_02',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_realestate',
      branchId: currentBranch?.id || 'branch_realestate_main',
      staffId: currentUser?.id || 'staff_01',
      title: 'Bureaux Open-Space Bab Ezzouar Cyberpark',
      propertyType: 'Office',
      listingType: 'Rental',
      surfaceM2: 280,
      roomsCount: 6,
      address: 'Tour Affaires B, Bab Ezzouar',
      cityWilaya: 'Bab Ezzouar, Alger',
      priceDzd: 450000,
      ownerName: 'Foncière Maghreb SPA',
      ownerPhone: '023 92 00 11',
      status: 'Available',
      amenities: ['Fibre optique', 'Climatisation VRV', 'Accès sécurisé badge', 'Parking 8 places'],
      createdAt: '2026-05-11T09:00:00Z',
    },
  ]);

  const [leases, setLeases] = useState<RealEstateLease[]>([
    {
      id: 'lease_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_realestate',
      branchId: currentBranch?.id || 'branch_realestate_main',
      staffId: currentUser?.id || 'staff_01',
      leaseNumber: 'BL-2026-0044',
      propertyId: 'prop_01',
      propertyTitle: 'Appartement F4 Hydra',
      tenantName: 'Karim Mansouri',
      tenantPhone: '0661 77 88 99',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      monthlyRentDzd: 180000,
      securityDepositDzd: 360000,
      agencyFeeDzd: 180000,
      paymentCycle: 'Monthly',
      status: 'Active',
      createdAt: '2026-01-01T08:00:00Z',
    },
  ]);

  // Form states
  const [propTitle, setPropTitle] = useState('');
  const [propType, setPropType] = useState<'Apartment' | 'Villa' | 'Commercial' | 'Office'>('Apartment');
  const [propPrice, setPropPrice] = useState('100000');
  const [propSurface, setPropSurface] = useState('100');
  const [propOwner, setPropOwner] = useState('');
  const [propPhone, setPropPhone] = useState('');

  const handleCreateProperty = (e: React.FormEvent) => {
    e.preventDefault();
    const created: RealEstateProperty = {
      id: `prop_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_realestate',
      branchId: currentBranch?.id || 'branch_realestate_main',
      staffId: currentUser?.id || 'staff_01',
      title: propTitle,
      propertyType: propType,
      listingType: 'Rental',
      surfaceM2: parseInt(propSurface, 10) || 100,
      roomsCount: 3,
      address: 'Alger Centre',
      cityWilaya: 'Alger',
      priceDzd: parseInt(propPrice, 10) || 100000,
      ownerName: propOwner || 'Propriétaire Privé',
      ownerPhone: propPhone || '0550 00 00 00',
      status: 'Available',
      createdAt: new Date().toISOString(),
    };

    setProperties([created, ...properties]);
    setIsPropertyModalOpen(false);
    setPropTitle('');
    showToast('Bien immobilier ajouté au catalogue', 'success');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-sm border border-blue-100 dark:border-blue-800">
            <Building2 size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'الوكالة العقارية وإدارة الأملاك' : 'Agence Immobilière & Gestion Locative'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                FacilityType: 20
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Baux de location, quittances de loyer mensuelles, états des lieux et règlements propriétaires
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPropertyModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>Nouveau Bien</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 flex items-center gap-6 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <Building2 size={15} />
          <span>Tableau de Bord</span>
        </button>
        <button
          onClick={() => setActiveTab('properties')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'properties' ? 'border-blue-600 text-blue-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <Home size={15} />
          <span>Biens & Catalogue ({properties.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('leases')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'leases' ? 'border-blue-600 text-blue-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <Key size={15} />
          <span>Baux & Quittances ({leases.length})</span>
        </button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-neutral-500 text-xs">Biens Gérés</div>
                <div className="text-2xl font-bold font-mono mt-1">{properties.length}</div>
              </div>
              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-neutral-500 text-xs">Loyers Mensuels Gérés</div>
                <div className="text-2xl font-bold font-mono mt-1 text-blue-600">
                  {formatMoney(
                    leases.reduce((acc, l) => acc + l.monthlyRentDzd, 0),
                    'DZD'
                  )}
                </div>
              </div>
              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-neutral-500 text-xs">Taux d'Occupation</div>
                <div className="text-2xl font-bold font-mono mt-1 text-emerald-600">
                  {Math.round((properties.filter((p) => p.status === 'Rented').length / (properties.length || 1)) * 100)}%
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold">Baux Actifs & Quittances du Mois</h3>
              {leases.map((l) => (
                <div key={l.id} className="py-3 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
                  <div>
                    <div className="text-xs font-bold">{l.propertyTitle} — Locataire: {l.tenantName}</div>
                    <div className="text-[11px] text-neutral-500">Période: {l.startDate} au {l.endDate}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs">{formatMoney(l.monthlyRentDzd, 'DZD')}/mois</span>
                    <button
                      onClick={() => showToast('Quittance de loyer officielle générée', 'success')}
                      className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold"
                    >
                      Émettre Quittance
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'properties' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {properties.map((p) => (
              <div key={p.id} className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
                    {p.propertyType} · {p.surfaceM2} m²
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.status === 'Rented' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                    {p.status === 'Rented' ? 'Loué' : 'Disponible'}
                  </span>
                </div>
                <div className="text-sm font-bold text-neutral-900 dark:text-white">{p.title}</div>
                <div className="text-xs text-neutral-500 flex items-center gap-1">
                  <MapPin size={12} />
                  <span>{p.address}</span>
                </div>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-blue-600">{formatMoney(p.priceDzd, 'DZD')}/mois</span>
                  <span className="text-[11px] text-neutral-500">Propriétaire: {p.ownerName}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isPropertyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-base font-bold">Nouveau Bien Immobilier</h2>
              <button onClick={() => setIsPropertyModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateProperty} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Titre de l'Annonce *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Villa F5 Hydra avec jardin"
                  value={propTitle}
                  onChange={(e) => setPropTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Loyer Mensuel (DZD) *</label>
                  <input
                    type="number"
                    value={propPrice}
                    onChange={(e) => setPropPrice(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Surface (m²)</label>
                  <input
                    type="number"
                    value={propSurface}
                    onChange={(e) => setPropSurface(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setIsPropertyModalOpen(false)} className="px-3 py-1.5 border rounded">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded font-medium">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

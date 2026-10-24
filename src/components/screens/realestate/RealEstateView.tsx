import React, { useState, useEffect } from 'react';
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
  Receipt,
  FileCheck,
  Download,
  Trash2,
  Phone,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { formatMoney } from '../../../utils/rules';
import { RealEstateProperty, RealEstateLease, RealEstateInspection } from '../../../types/index';

interface RealEstateViewProps {
  initialTab?: 'dashboard' | 'properties' | 'leases' | 'inspections' | 'finance';
}

export const RealEstateView: React.FC<RealEstateViewProps> = ({ initialTab = 'dashboard' }) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const { t } = useTranslation();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'dashboard' | 'properties' | 'leases' | 'inspections' | 'finance'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [selectedLeaseForQuittance, setSelectedLeaseForQuittance] = useState<RealEstateLease | null>(null);
  const [selectedOwnerForStatement, setSelectedOwnerForStatement] = useState<string | null>(null);

  // Mock State with Algerian Context
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
    {
      id: 'prop_03',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_realestate',
      branchId: currentBranch?.id || 'branch_realestate_main',
      staffId: currentUser?.id || 'staff_01',
      title: 'Villa Coloniale R+1 avec Piscine El Biar',
      propertyType: 'Villa',
      listingType: 'Rental',
      surfaceM2: 360,
      roomsCount: 7,
      address: 'Chemin Mackley, El Biar',
      cityWilaya: 'El Biar, Alger',
      priceDzd: 550000,
      ownerName: 'Dr. Rachid Benyoucef',
      ownerPhone: '0661 22 33 44',
      status: 'Rented',
      amenities: ['Piscine', 'Jardin arboré', 'Bâche à eau 10m³', 'Loge gardien'],
      createdAt: '2026-05-12T10:00:00Z',
    },
    {
      id: 'prop_04',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_realestate',
      branchId: currentBranch?.id || 'branch_realestate_main',
      staffId: currentUser?.id || 'staff_01',
      title: 'Local Commercial Boulevard Didouche Mourad',
      propertyType: 'Commercial',
      listingType: 'Rental',
      surfaceM2: 95,
      roomsCount: 2,
      address: '144 Boulevard Didouche Mourad',
      cityWilaya: 'Alger Centre',
      priceDzd: 220000,
      ownerName: 'Mourad Hadj-Sadok',
      ownerPhone: '0770 55 66 77',
      status: 'Available',
      amenities: ['Façade vitrée 8m', 'Rideau électrique', 'Sanitaires', 'Compteur triphasé'],
      createdAt: '2026-05-13T11:00:00Z',
    },
  ]);

  const [leases, setLeases] = useState<RealEstateLease[]>([
    {
      id: 'lease_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_realestate',
      branchId: currentBranch?.id || 'branch_realestate_main',
      staffId: currentUser?.id || 'staff_01',
      leaseNumber: 'BAIL-2026-0044',
      propertyId: 'prop_01',
      propertyTitle: 'Appartement Haut Standing F4 Hydra',
      tenantName: 'Karim Mansouri (Directeur Général)',
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
    {
      id: 'lease_02',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_realestate',
      branchId: currentBranch?.id || 'branch_realestate_main',
      staffId: currentUser?.id || 'staff_01',
      leaseNumber: 'BAIL-2026-0045',
      propertyId: 'prop_03',
      propertyTitle: 'Villa Coloniale R+1 avec Piscine El Biar',
      tenantName: 'Ambassade & Mission Diplomatique',
      tenantPhone: '023 79 11 22',
      startDate: '2026-02-01',
      endDate: '2027-01-31',
      monthlyRentDzd: 550000,
      securityDepositDzd: 1100000,
      agencyFeeDzd: 550000,
      paymentCycle: 'Quarterly',
      status: 'Active',
      createdAt: '2026-02-01T08:00:00Z',
    },
  ]);

  const [inspections, setInspections] = useState<RealEstateInspection[]>([
    {
      id: 'insp_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_realestate',
      branchId: currentBranch?.id || 'branch_realestate_main',
      staffId: currentUser?.id || 'staff_01',
      leaseId: 'lease_01',
      propertyTitle: 'Appartement F4 Hydra',
      tenantName: 'Karim Mansouri',
      type: 'CheckIn',
      inspectionDate: '2026-01-01',
      meterElectricityKwh: 48920,
      meterGasM3: 12430,
      meterWaterM3: 1560,
      keysCount: 6,
      generalCondition: 'Excellent',
      observations: 'Peinture neuve, chaudière révisée, télécommandes parking remises (2 exemplaires).',
      isSigned: true,
      createdAt: '2026-01-01T09:00:00Z',
    },
    {
      id: 'insp_02',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_realestate',
      branchId: currentBranch?.id || 'branch_realestate_main',
      staffId: currentUser?.id || 'staff_01',
      leaseId: 'lease_02',
      propertyTitle: 'Villa Coloniale El Biar',
      tenantName: 'Mission Diplomatique',
      type: 'CheckIn',
      inspectionDate: '2026-02-01',
      meterElectricityKwh: 71200,
      meterGasM3: 34100,
      meterWaterM3: 2890,
      keysCount: 12,
      generalCondition: 'Good',
      observations: 'Piscine en eau et système filtration opérationnel. Inventaire mobilier joint.',
      isSigned: true,
      createdAt: '2026-02-01T10:00:00Z',
    },
  ]);

  // Form states for Property Modal
  const [propTitle, setPropTitle] = useState('');
  const [propType, setPropType] = useState<'Apartment' | 'Villa' | 'Commercial' | 'Office' | 'Warehouse'>('Apartment');
  const [propListing, setPropListing] = useState<'Rental' | 'Sale'>('Rental');
  const [propPrice, setPropPrice] = useState('150000');
  const [propSurface, setPropSurface] = useState('120');
  const [propRooms, setPropRooms] = useState('3');
  const [propAddress, setPropAddress] = useState('');
  const [propCity, setPropCity] = useState('Alger');
  const [propOwner, setPropOwner] = useState('');
  const [propPhone, setPropPhone] = useState('');
  const [propAmenities, setPropAmenities] = useState('Chauffage central, Ascenseur, Garage');

  // Form states for Lease Modal
  const [leasePropId, setLeasePropId] = useState(properties[0]?.id || '');
  const [leaseTenant, setLeaseTenant] = useState('');
  const [leasePhone, setLeasePhone] = useState('');
  const [leaseRent, setLeaseRent] = useState('150000');
  const [leaseDeposit, setLeaseDeposit] = useState('300000');
  const [leaseStart, setLeaseStart] = useState('2026-06-01');
  const [leaseEnd, setLeaseEnd] = useState('2027-05-31');

  // Form states for Inspection Modal
  const [inspLeaseId, setInspLeaseId] = useState(leases[0]?.id || '');
  const [inspType, setInspType] = useState<'CheckIn' | 'CheckOut'>('CheckIn');
  const [inspElec, setInspElec] = useState('50000');
  const [inspGas, setInspGas] = useState('12000');
  const [inspWater, setInspWater] = useState('1500');
  const [inspKeys, setInspKeys] = useState('4');
  const [inspCondition, setInspCondition] = useState<'Excellent' | 'Good' | 'Fair' | 'Poor'>('Excellent');
  const [inspNotes, setInspNotes] = useState('Locaux propres, serrures vérifiées, compteurs relevés.');

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
      listingType: propListing,
      surfaceM2: parseInt(propSurface, 10) || 100,
      roomsCount: parseInt(propRooms, 10) || 3,
      address: propAddress || 'Alger',
      cityWilaya: propCity,
      priceDzd: parseInt(propPrice, 10) || 100000,
      ownerName: propOwner || 'Propriétaire Privé',
      ownerPhone: propPhone || '0550 00 00 00',
      status: 'Available',
      amenities: propAmenities.split(',').map((s) => s.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
    };

    setProperties([created, ...properties]);
    setIsPropertyModalOpen(false);
    setPropTitle('');
    setPropAddress('');
    showToast({
      type: 'success',
      title: isAr ? 'تمت إضافة العقار' : 'Bien Référencé',
      message: `${created.title} ajouté au portefeuille agence.`,
    });
  };

  const handleCreateLease = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenProp = properties.find((p) => p.id === leasePropId) || properties[0];
    const createdLease: RealEstateLease = {
      id: `lease_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_realestate',
      branchId: currentBranch?.id || 'branch_realestate_main',
      staffId: currentUser?.id || 'staff_01',
      leaseNumber: `BAIL-2026-${String(leases.length + 46).padStart(4, '0')}`,
      propertyId: chosenProp.id,
      propertyTitle: chosenProp.title,
      tenantName: leaseTenant,
      tenantPhone: leasePhone,
      startDate: leaseStart,
      endDate: leaseEnd,
      monthlyRentDzd: parseInt(leaseRent, 10) || chosenProp.priceDzd,
      securityDepositDzd: parseInt(leaseDeposit, 10) || chosenProp.priceDzd * 2,
      agencyFeeDzd: parseInt(leaseRent, 10) || chosenProp.priceDzd,
      paymentCycle: 'Monthly',
      status: 'Active',
      createdAt: new Date().toISOString(),
    };

    setLeases([createdLease, ...leases]);
    setProperties(properties.map((p) => (p.id === chosenProp.id ? { ...p, status: 'Rented' } : p)));
    setIsLeaseModalOpen(false);
    setLeaseTenant('');
    setLeasePhone('');
    showToast({
      type: 'success',
      title: isAr ? 'تم تحرير عقد الكراء' : 'Bail Enregistré',
      message: `Contrat ${createdLease.leaseNumber} signé avec ${createdLease.tenantName}.`,
    });
  };

  const handleCreateInspection = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenLease = leases.find((l) => l.id === inspLeaseId) || leases[0];
    const createdInsp: RealEstateInspection = {
      id: `insp_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_realestate',
      branchId: currentBranch?.id || 'branch_realestate_main',
      staffId: currentUser?.id || 'staff_01',
      leaseId: chosenLease.id,
      propertyTitle: chosenLease.propertyTitle,
      tenantName: chosenLease.tenantName,
      type: inspType,
      inspectionDate: new Date().toISOString().split('T')[0],
      meterElectricityKwh: parseInt(inspElec, 10) || 0,
      meterGasM3: parseInt(inspGas, 10) || 0,
      meterWaterM3: parseInt(inspWater, 10) || 0,
      keysCount: parseInt(inspKeys, 10) || 4,
      generalCondition: inspCondition,
      observations: inspNotes,
      isSigned: true,
      createdAt: new Date().toISOString(),
    };

    setInspections([createdInsp, ...inspections]);
    setIsInspectionModalOpen(false);
    showToast({
      type: 'success',
      title: isAr ? 'تم توثيق معاينة الأماكن' : 'État des Lieux Établi',
      message: `${inspType === 'CheckIn' ? 'Entrée' : 'Sortie'} validée pour ${chosenLease.propertyTitle}.`,
    });
  };

  // Calculations
  const totalProperties = properties.length;
  const rentedProperties = properties.filter((p) => p.status === 'Rented').length;
  const occupancyRate = Math.round((rentedProperties / (totalProperties || 1)) * 100);
  const totalMonthlyRollDzd = leases.reduce((acc, l) => acc + l.monthlyRentDzd, 0);
  const totalAnnualRollDzd = totalMonthlyRollDzd * 12;
  const totalDepositsHeldDzd = leases.reduce((acc, l) => acc + l.securityDepositDzd, 0);

  // Filtered properties
  const filteredProperties = properties.filter((p) => {
    const matchSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType === 'all' || p.propertyType === filterType;
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans">
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-sm border border-blue-100 dark:border-blue-800">
            <Building2 size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {isAr ? 'الوكالة العقارية وإدارة الأملاك' : 'Agence Immobilière & Gestion Locative'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                FacilityType: 20
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              {isAr
                ? 'إدارة محفظة العقارات، عقود الكراء، وصولات الإيجار، معاينة الأماكن ومستحقات الملاك'
                : 'Baux de location, quittances de loyer, états des lieux et règlements propriétaires'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPropertyModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>{isAr ? 'إضافة عقار' : '+ Nouveau Bien'}</span>
          </button>
          <button
            onClick={() => setIsLeaseModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Key size={15} />
            <span>{isAr ? 'عقد كراء جديد' : '+ Nouveau Bail'}</span>
          </button>
          <button
            onClick={() => setIsInspectionModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <FileCheck size={15} />
            <span>{isAr ? 'معاينة أماكن' : '+ État des Lieux'}</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 flex items-center gap-6 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <Building2 size={15} />
          <span>{isAr ? 'لوحة الوكالة' : 'Tableau Agence'}</span>
        </button>
        <button
          onClick={() => setActiveTab('properties')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'properties' ? 'border-blue-600 text-blue-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <Home size={15} />
          <span>{isAr ? `العقارات (${properties.length})` : `Biens & Catalogue (${properties.length})`}</span>
        </button>
        <button
          onClick={() => setActiveTab('leases')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'leases' ? 'border-blue-600 text-blue-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <Key size={15} />
          <span>{isAr ? `عقود الكراء (${leases.length})` : `Baux & Contrats (${leases.length})`}</span>
        </button>
        <button
          onClick={() => setActiveTab('inspections')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'inspections' ? 'border-blue-600 text-blue-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <FileCheck size={15} />
          <span>{isAr ? `معاينة الأماكن (${inspections.length})` : `États des Lieux (${inspections.length})`}</span>
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'finance' ? 'border-blue-600 text-blue-600' : 'border-transparent text-neutral-500'
          }`}
        >
          <Receipt size={15} />
          <span>{isAr ? 'الوصولات وحسابات الملاك' : 'Quittances & Règlements'}</span>
        </button>
      </div>

      {/* Content Canvas */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: DASHBOARD                                                          */}
        {/* ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-neutral-500 text-xs">{isAr ? 'إجمالي العقارات المدارة' : 'Biens Sous Gestion'}</div>
                <div className="text-2xl font-bold font-mono mt-1 text-blue-600">{totalProperties}</div>
                <div className="text-[11px] text-neutral-400 mt-1">{rentedProperties} loués · {totalProperties - rentedProperties} disponibles</div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-neutral-500 text-xs">{isAr ? 'مجموع الإيجارات الشهرية' : 'Loyer Mensuel Global'}</div>
                <div className="text-2xl font-bold font-mono mt-1 text-emerald-600">
                  {formatMoney(totalMonthlyRollDzd, 'DZD')}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">{formatMoney(totalAnnualRollDzd, 'DZD')} / an</div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-neutral-500 text-xs">{isAr ? 'نسبة الإشغال العقاري' : "Taux d'Occupation"}</div>
                <div className="text-2xl font-bold font-mono mt-1 text-indigo-600">{occupancyRate}%</div>
                <div className="text-[11px] text-emerald-600 mt-1 font-medium">Portefeuille optimisé</div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-neutral-500 text-xs">{isAr ? 'ودائع الضمان المحتجزة' : 'Cautions Séquestrées'}</div>
                <div className="text-2xl font-bold font-mono mt-1 text-amber-600">
                  {formatMoney(totalDepositsHeldDzd, 'DZD')}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">Compte de garantie locative</div>
              </div>
            </div>

            {/* Quick Actions & Recent Leases */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Key size={16} className="text-blue-600" />
                    <span>{isAr ? 'عقود الكراء السارية والوصولات الشهرية' : 'Baux Actifs & Quittances du Mois'}</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('leases')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    {isAr ? 'عرض الكل' : 'Voir tous les baux'}
                  </button>
                </div>

                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {leases.map((l) => (
                    <div key={l.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-neutral-900 dark:text-white">
                          {l.propertyTitle}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {l.tenantName} · {l.tenantPhone} · {l.startDate} au {l.endDate}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-xs text-blue-600">
                          {formatMoney(l.monthlyRentDzd, 'DZD')}/mois
                        </span>
                        <button
                          onClick={() => setSelectedLeaseForQuittance(l)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Printer size={13} />
                          <span>{isAr ? 'وصل الكراء' : 'Quittance'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legal & Operations Quick Sheet */}
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span>{isAr ? 'الامتثال القانوني والجبائي' : 'Conformité & Barème Agence'}</span>
                </h3>
                <div className="space-y-3 text-xs text-neutral-600 dark:text-neutral-400">
                  <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 space-y-1">
                    <div className="font-semibold text-neutral-900 dark:text-white">Frais de Gestion Agence</div>
                    <div>Commission standard: 1 mois de loyer à la signature ou 8% du loyer mensuel encaissé.</div>
                  </div>
                  <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 space-y-1">
                    <div className="font-semibold text-neutral-900 dark:text-white">Dépôt de Garantie (Caution)</div>
                    <div>2 mois de loyer séquestrés, restituables sous 30 jours après état des lieux de sortie.</div>
                  </div>
                  <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 space-y-1">
                    <div className="font-semibold text-neutral-900 dark:text-white">Enregistrement Légal</div>
                    <div>Enregistrement du bail auprès de l'inspection fiscale des impôts territorialement compétente.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PROPERTIES                                                         */}
        {/* ========================================================================= */}
        {activeTab === 'properties' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-2.5 text-neutral-400" />
                  <input
                    type="text"
                    placeholder={isAr ? 'بحث في العقارات، الملاك، العناوين...' : 'Rechercher un bien, propriétaire, adresse...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs bg-white dark:bg-neutral-900"
                >
                  <option value="all">Tous les types</option>
                  <option value="Apartment">Appartements</option>
                  <option value="Villa">Villas</option>
                  <option value="Office">Bureaux</option>
                  <option value="Commercial">Locaux commerciaux</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs bg-white dark:bg-neutral-900"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="Available">Disponible</option>
                  <option value="Rented">Loué</option>
                </select>
              </div>
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProperties.map((p) => (
                <div
                  key={p.id}
                  className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono">
                        {p.propertyType} · {p.surfaceM2} m² · F{p.roomsCount}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          p.status === 'Rented'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {p.status === 'Rented' ? 'Loué' : 'Disponible'}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-neutral-900 dark:text-white">{p.title}</div>

                    <div className="text-xs text-neutral-500 flex items-center gap-1">
                      <MapPin size={13} className="shrink-0 text-neutral-400" />
                      <span>{p.address}</span>
                    </div>

                    {p.amenities && p.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {p.amenities.map((a, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] text-neutral-400">Loyer Mensuel</div>
                      <div className="font-mono font-bold text-sm text-blue-600">
                        {formatMoney(p.priceDzd, 'DZD')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-neutral-400">Propriétaire</div>
                      <div className="font-medium text-neutral-900 dark:text-white">{p.ownerName}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: LEASES & CONTRACTS                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'leases' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <span className="font-bold text-xs">{leases.length} Baux de Location Enregistrés</span>
                <button
                  onClick={() => setIsLeaseModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Nouveau Bail</span>
                </button>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {leases.map((l) => (
                  <div key={l.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                          {l.leaseNumber}
                        </span>
                        <span className="font-bold text-sm text-neutral-900 dark:text-white">{l.propertyTitle}</span>
                      </div>
                      <div className="text-xs text-neutral-500 flex items-center gap-3">
                        <span>Locataire: <strong className="text-neutral-900 dark:text-white">{l.tenantName}</strong> ({l.tenantPhone})</span>
                        <span>·</span>
                        <span>Période: {l.startDate} au {l.endDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-[10px] text-neutral-400">Loyer & Caution</div>
                        <div className="font-mono font-bold text-xs text-blue-600">
                          {formatMoney(l.monthlyRentDzd, 'DZD')} / mois
                        </div>
                        <div className="text-[10px] font-mono text-neutral-500">
                          Caution: {formatMoney(l.securityDepositDzd, 'DZD')}
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedLeaseForQuittance(l)}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Printer size={14} />
                        <span>Émettre Quittance</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: INSPECTIONS (ÉTATS DES LIEUX)                                      */}
        {/* ========================================================================= */}
        {activeTab === 'inspections' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inspections.map((insp) => (
                <div key={insp.id} className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono">
                      {insp.type === 'CheckIn' ? 'État des Lieux Entrée' : 'État des Lieux Sortie'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600">
                      Date: {insp.inspectionDate}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-neutral-900 dark:text-white">{insp.propertyTitle}</div>
                  <div className="text-xs text-neutral-500">Locataire: {insp.tenantName}</div>

                  {/* Meters table */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 font-mono text-center text-xs">
                    <div>
                      <div className="text-[10px] text-neutral-400">Électricité (kWh)</div>
                      <div className="font-bold mt-0.5">{insp.meterElectricityKwh}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-400">Gaz (m³)</div>
                      <div className="font-bold mt-0.5">{insp.meterGasM3}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-400">Eau (m³)</div>
                      <div className="font-bold mt-0.5">{insp.meterWaterM3}</div>
                    </div>
                  </div>

                  <div className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-lg">
                    <span className="font-semibold text-neutral-900 dark:text-white">Observations: </span>
                    {insp.observations}
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Clés remises: {insp.keysCount} trousseaux</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      <span>Signé contradictoirement</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: FINANCE & SETTLEMENTS                                              */}
        {/* ========================================================================= */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Receipt size={16} className="text-blue-600" />
                <span>Comptes de Gestion & Règlements Propriétaires</span>
              </h3>
              <p className="text-xs text-neutral-500">
                Calcul automatisé des loyers perçus, déduction de la commission d'agence (8%) et reversement net au propriétaire.
              </p>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {properties.map((p) => {
                  const monthlyLoyer = p.priceDzd;
                  const commissionAgence = Math.round(monthlyLoyer * 0.08);
                  const netProprietaire = monthlyLoyer - commissionAgence;

                  return (
                    <div key={p.id} className="py-3 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-neutral-900 dark:text-white">{p.ownerName}</div>
                        <div className="text-[11px] text-neutral-500">Bien: {p.title} · {p.ownerPhone}</div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-[10px] text-neutral-400">Loyer / Commission / Net</div>
                          <div className="font-mono text-xs">
                            <span className="text-neutral-900 dark:text-white font-bold">{formatMoney(monthlyLoyer, 'DZD')}</span>
                            <span className="text-neutral-400"> - </span>
                            <span className="text-amber-600 font-semibold">{formatMoney(commissionAgence, 'DZD')} (8%)</span>
                            <span className="text-neutral-400"> = </span>
                            <span className="text-emerald-600 font-bold">{formatMoney(netProprietaire, 'DZD')}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedOwnerForStatement(p.ownerName);
                            showToast({
                              type: 'success',
                              title: 'Virement Propriétaire Effectué',
                              message: `Relevé de gestion émis pour ${p.ownerName}.`,
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold cursor-pointer"
                        >
                          Émettre Virement Net
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: NOUVEAU BIEN IMMOBILIER                                          */}
      {/* ========================================================================= */}
      {isPropertyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Building2 size={18} className="text-blue-600" />
                <span>Nouveau Bien Immobilier</span>
              </h2>
              <button onClick={() => setIsPropertyModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProperty} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Titre de l'Annonce *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Villa F5 Hydra avec jardin arboré"
                  value={propTitle}
                  onChange={(e) => setPropTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Type de Bien</label>
                  <select
                    value={propType}
                    onChange={(e: any) => setPropType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  >
                    <option value="Apartment">Appartement</option>
                    <option value="Villa">Villa</option>
                    <option value="Office">Bureaux</option>
                    <option value="Commercial">Local Commercial</option>
                    <option value="Warehouse">Hangar / Dépôt</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Transaction</label>
                  <select
                    value={propListing}
                    onChange={(e: any) => setPropListing(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  >
                    <option value="Rental">Location</option>
                    <option value="Sale">Vente</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Prix / Loyer (DZD) *</label>
                  <input
                    required
                    type="number"
                    value={propPrice}
                    onChange={(e) => setPropPrice(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Surface (m²)</label>
                  <input
                    type="number"
                    value={propSurface}
                    onChange={(e) => setPropSurface(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Pièces (F)</label>
                  <input
                    type="number"
                    value={propRooms}
                    onChange={(e) => setPropRooms(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Adresse Complète</label>
                <input
                  type="text"
                  placeholder="Ex: Résidence Les Pins, Djenane El Malik, Hydra, Alger"
                  value={propAddress}
                  onChange={(e) => setPropAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Nom Propriétaire</label>
                  <input
                    type="text"
                    placeholder="M. Kamel Boumaza"
                    value={propOwner}
                    onChange={(e) => setPropOwner(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Téléphone Propriétaire</label>
                  <input
                    type="text"
                    placeholder="0550 11 22 33"
                    value={propPhone}
                    onChange={(e) => setPropPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsPropertyModalOpen(false)}
                  className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium cursor-pointer"
                >
                  Enregistrer le Bien
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: NOUVEAU CONTRAT DE BAIL                                          */}
      {/* ========================================================================= */}
      {isLeaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Key size={18} className="text-blue-600" />
                <span>Nouveau Contrat de Bail Locatif</span>
              </h2>
              <button onClick={() => setIsLeaseModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLease} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Sélectionner le Bien *</label>
                <select
                  value={leasePropId}
                  onChange={(e) => setLeasePropId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({formatMoney(p.priceDzd, 'DZD')}/mois) - {p.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Nom du Locataire *</label>
                  <input
                    required
                    type="text"
                    placeholder="M. Karim Mansouri"
                    value={leaseTenant}
                    onChange={(e) => setLeaseTenant(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Téléphone Locataire *</label>
                  <input
                    required
                    type="text"
                    placeholder="0661 77 88 99"
                    value={leasePhone}
                    onChange={(e) => setLeasePhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Loyer Mensuel (DZD) *</label>
                  <input
                    required
                    type="number"
                    value={leaseRent}
                    onChange={(e) => setLeaseRent(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Caution Séquestrée (DZD)</label>
                  <input
                    type="number"
                    value={leaseDeposit}
                    onChange={(e) => setLeaseDeposit(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Date Début Bail</label>
                  <input
                    type="date"
                    value={leaseStart}
                    onChange={(e) => setLeaseStart(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Date Fin Bail</label>
                  <input
                    type="date"
                    value={leaseEnd}
                    onChange={(e) => setLeaseEnd(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsLeaseModalOpen(false)}
                  className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium cursor-pointer"
                >
                  Signer le Bail
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ÉTAT DES LIEUX                                                   */}
      {/* ========================================================================= */}
      {isInspectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <FileCheck size={18} className="text-emerald-600" />
                <span>Nouveau Procès-Verbal d'État des Lieux</span>
              </h2>
              <button onClick={() => setIsInspectionModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInspection} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Bail Associé *</label>
                <select
                  value={inspLeaseId}
                  onChange={(e) => setInspLeaseId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                >
                  {leases.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.leaseNumber} — {l.propertyTitle} ({l.tenantName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Type d'État des Lieux</label>
                  <select
                    value={inspType}
                    onChange={(e: any) => setInspType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  >
                    <option value="CheckIn">Entrée (Remise des clés)</option>
                    <option value="CheckOut">Sortie (Restitution)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">État Général Constaté</label>
                  <select
                    value={inspCondition}
                    onChange={(e: any) => setInspCondition(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  >
                    <option value="Excellent">Très Bon État (Neuf)</option>
                    <option value="Good">Bon État d'Usage</option>
                    <option value="Fair">État Moyen (Traces d'usure)</option>
                    <option value="Poor">Dégradations Constatées</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Compteur Élec (kWh)</label>
                  <input
                    type="number"
                    value={inspElec}
                    onChange={(e) => setInspElec(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Compteur Gaz (m³)</label>
                  <input
                    type="number"
                    value={inspGas}
                    onChange={(e) => setInspGas(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Compteur Eau (m³)</label>
                  <input
                    type="number"
                    value={inspWater}
                    onChange={(e) => setInspWater(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Nombre de Clés Remises</label>
                <input
                  type="number"
                  value={inspKeys}
                  onChange={(e) => setInspKeys(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Observations & Remarques Contradictoires</label>
                <textarea
                  rows={3}
                  value={inspNotes}
                  onChange={(e) => setInspNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsInspectionModalOpen(false)}
                  className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium cursor-pointer"
                >
                  Valider l'État des Lieux
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: QUITTANCE DE LOYER (PRINTABLE FISCAL RECEIPT)                      */}
      {/* ========================================================================= */}
      {selectedLeaseForQuittance && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-neutral-900 rounded-2xl max-w-xl w-full p-8 shadow-2xl border border-neutral-200 space-y-6 text-xs">
            {/* Printable Document Header */}
            <div className="border-b-2 border-neutral-900 pb-4 flex items-center justify-between">
              <div>
                <div className="text-base font-black tracking-wider uppercase">
                  {currentBusiness?.name || 'ATRIUM IMMOBILIER & GESTION'}
                </div>
                <div className="text-neutral-500 text-[11px]">
                  Agence Immobilière Agréée · Alger, Algérie
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold font-mono text-blue-600">
                  QUITTANCE N° {selectedLeaseForQuittance.leaseNumber.replace('BAIL', 'QUIT')}
                </div>
                <div className="text-[10px] text-neutral-400">Date: {new Date().toLocaleDateString('fr-FR')}</div>
              </div>
            </div>

            {/* Quittance Body */}
            <div className="space-y-4 text-xs leading-relaxed">
              <p>
                Je soussigné, gestionnaire de l'agence immobilière pour le compte du propriétaire bailleur,
                déclare avoir reçu de :
              </p>
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 font-medium">
                <strong>Locataire :</strong> {selectedLeaseForQuittance.tenantName} <br />
                <strong>Téléphone :</strong> {selectedLeaseForQuittance.tenantPhone} <br />
                <strong>Bien loué :</strong> {selectedLeaseForQuittance.propertyTitle}
              </div>

              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-between font-mono">
                <div>
                  <div className="text-[10px] text-neutral-400 uppercase">Loyer Mensuel Net</div>
                  <div className="text-base font-bold text-neutral-900">
                    {formatMoney(selectedLeaseForQuittance.monthlyRentDzd, 'DZD')}
                  </div>
                </div>
                <div className="text-right text-[11px] text-emerald-700 font-semibold">
                  Pour acquit et libération totale du mois en cours
                </div>
              </div>

              <p className="text-[11px] text-neutral-500 italic">
                La présente quittance annule tous les reçus qui auraient pu être donnés pour acompte et ne dispense
                pas le locataire du paiement des loyers postérieurs.
              </p>
            </div>

            {/* Stamp & Signature Box */}
            <div className="pt-4 border-t border-neutral-200 flex items-center justify-between">
              <div className="text-[10px] text-neutral-400">
                Paiement reçu en Espèces / BaridiMob
              </div>
              <div className="w-36 h-20 border-2 border-dashed border-blue-400 rounded-lg flex flex-col items-center justify-center text-[10px] text-blue-700 font-bold bg-blue-50/50">
                <span>CACHET DE L'AGENCE</span>
                <span className="text-[9px] text-neutral-400 font-normal">Pour Acquit</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setSelectedLeaseForQuittance(null)}
                className="px-4 py-2 border rounded-lg hover:bg-neutral-100 font-medium cursor-pointer"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  window.print();
                  showToast({
                    type: 'success',
                    title: 'Quittance Imprimée',
                    message: 'Document fiscal officiel prêt.',
                  });
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer size={15} />
                <span>Imprimer la Quittance</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

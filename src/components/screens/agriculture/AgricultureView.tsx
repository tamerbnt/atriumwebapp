import React, { useState, useEffect, useMemo } from 'react';
import {
  Sprout,
  Tractor,
  Wheat,
  Scale,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
  MapPin,
  Calendar,
  AlertTriangle,
  Droplets,
  DollarSign,
  Truck,
  Leaf,
  Layers,
  Thermometer,
  X,
  Check,
  Eye,
  Filter,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { useTranslation } from '../../../utils/useTranslation';
import { formatMoney } from '../../../utils/rules';
import {
  AgriParcel,
  AgriLivestock,
  AgriTreatmentLog,
  AgriHarvestTicket,
} from '../../../types/index';

interface AgricultureViewProps {
  initialTab?: 'dashboard' | 'parcels' | 'crops' | 'harvest' | 'livestock' | 'finance';
}

export const AgricultureView: React.FC<AgricultureViewProps> = ({ initialTab }) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const isRtl = language === 'ar';

  const [activeTab, setActiveTab] = useState<'dashboard' | 'parcels' | 'crops' | 'harvest' | 'livestock' | 'finance'>(
    initialTab || 'dashboard'
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Parcels & Greenhouses State
  const [parcels, setParcels] = useState<AgriParcel[]>([
    {
      id: 'parc_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      name: 'Verger Nord - Orangers Thomson & Navel',
      surfaceHectares: 14.5,
      irrigationType: 'Drip',
      soilType: 'Argilo-limoneux profond',
      currentCrop: 'Oranges Thomson & Clémentines',
      plantingDate: '2023-10-15',
      expectedHarvestDate: '2026-11-25',
      status: 'Growing',
      createdAt: '2026-01-10T08:00:00Z',
    },
    {
      id: 'parc_02',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      name: 'Bloc Serres Multi-Chapelles Maraîchage',
      surfaceHectares: 3.5,
      irrigationType: 'Drip',
      soilType: 'Sableux amendé bio-fertilisé',
      currentCrop: 'Tomates Industrielles & Poivrons Doux',
      plantingDate: '2026-02-10',
      expectedHarvestDate: '2026-06-15',
      status: 'Harvesting',
      createdAt: '2026-01-10T08:00:00Z',
    },
    {
      id: 'parc_03',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      name: 'Oliveraie Sud - Variété Chemlal & Sigoise',
      surfaceHectares: 22.0,
      irrigationType: 'Drip',
      soilType: 'Calcaire bien drainé',
      currentCrop: 'Olives à Huile (Chemlal)',
      plantingDate: '2022-03-20',
      expectedHarvestDate: '2026-11-10',
      status: 'Growing',
      createdAt: '2026-01-10T08:00:00Z',
    },
    {
      id: 'parc_04',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      name: 'Plaine Céréalière - Blé Dur Simeto',
      surfaceHectares: 35.0,
      irrigationType: 'Pivot',
      soilType: 'Limono-argileux riche',
      currentCrop: 'Blé Dur (Semences Certifiées)',
      plantingDate: '2025-11-30',
      expectedHarvestDate: '2026-06-30',
      status: 'Growing',
      createdAt: '2026-01-10T08:00:00Z',
    },
  ]);

  // Selected Parcel
  const [selectedParcelId, setSelectedParcelId] = useState<string>('parc_02');
  const selectedParcel = useMemo(() => {
    return parcels.find((p) => p.id === selectedParcelId) || parcels[0];
  }, [parcels, selectedParcelId]);

  // Phytosanitary & Fertilizer Treatment Logs
  const [treatmentLogs, setTreatmentLogs] = useState<AgriTreatmentLog[]>([
    {
      id: 'treat_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      parcelId: 'parc_02',
      treatmentDate: '2026-05-02',
      commercialProductName: 'Cuprocol 50 WG (Bio)',
      activeIngredient: 'Oxychlorure de Cuivre 500g/kg',
      targetPestDisease: 'Mildiou de la Tomate & Bactériose',
      dosagePerHa: '2.5 kg/ha',
      darDays: 7, // 7 days safety interval
      harvestAllowedDate: '2026-05-09',
      operatorName: 'Abdelkader (Chef Culture)',
      notes: 'Pulvérisation par atomiseur tracté le matin sans vent. DAR respecté.',
      createdAt: '2026-05-02T09:00:00Z',
    },
    {
      id: 'treat_02',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      parcelId: 'parc_01',
      treatmentDate: '2026-05-12',
      commercialProductName: 'Soufre Micronisé Soluble',
      activeIngredient: 'Soufre pur 80%',
      targetPestDisease: 'Oïdium et Acariens des agrumes',
      dosagePerHa: '5.0 kg/ha',
      darDays: 5,
      harvestAllowedDate: '2026-05-17',
      operatorName: 'Ali M.',
      notes: 'Traitement préventif suite à hausse de température.',
      createdAt: '2026-05-12T10:00:00Z',
    },
  ]);

  // Weighbridge & Harvest Tickets (Pesage Poids Public & Ventes Mandataires)
  const [harvestTickets, setHarvestTickets] = useState<AgriHarvestTicket[]>([
    {
      id: 'pes_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      ticketNumber: 'PES-2026-018',
      parcelId: 'parc_02',
      cropDesignation: 'Tomates Maraîchères Calibre 1',
      vehiclePlate: '00142-126-16',
      driverName: 'Hakim Benziane',
      grossWeightKg: 8450,
      tareWeightKg: 3200,
      netWeightKg: 5250,
      cratesCount: 260,
      unitPriceDzdPerKg: 75,
      totalGrossDzd: 393750,
      mandataireFeePercent: 6,
      netFarmPayoutDzd: 370125,
      destinationWholesaleMarket: 'Marché de Gros des Eucalyptus, Alger',
      date: '2026-05-15',
      createdAt: '2026-05-15T07:30:00Z',
    },
    {
      id: 'pes_02',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      ticketNumber: 'PES-2026-019',
      parcelId: 'parc_02',
      cropDesignation: 'Poivrons Doux Verts',
      vehiclePlate: '04890-124-09',
      driverName: 'Mustapha Larbi',
      grossWeightKg: 6100,
      tareWeightKg: 3150,
      netWeightKg: 2950,
      cratesCount: 195,
      unitPriceDzdPerKg: 110,
      totalGrossDzd: 324500,
      mandataireFeePercent: 6,
      netFarmPayoutDzd: 305030,
      destinationWholesaleMarket: 'Marché de Gros Bougara, Blida',
      date: '2026-05-17',
      createdAt: '2026-05-17T08:00:00Z',
    },
  ]);

  // Livestock Cheptel State
  const [livestock, setLivestock] = useState<AgriLivestock[]>([
    {
      id: 'cow_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      earTagNumber: 'DZ-16-0942',
      species: 'Bovine',
      breed: 'Holstein Frisonne Prime',
      gender: 'Female',
      birthDate: '2022-04-10',
      healthStatus: 'Healthy',
      dailyProductionLiters: 28.5,
      notes: 'Lactation 2ème cycle. Vaccination fièvre aphteuse à jour.',
      createdAt: '2026-01-15T08:00:00Z',
    },
    {
      id: 'cow_02',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      earTagNumber: 'DZ-16-0943',
      species: 'Bovine',
      breed: 'Montbéliarde Laitière',
      gender: 'Female',
      birthDate: '2023-01-18',
      healthStatus: 'Healthy',
      dailyProductionLiters: 25.0,
      notes: 'Insémination artificielle certifiée. Taux protéique élevé.',
      createdAt: '2026-01-15T08:00:00Z',
    },
    {
      id: 'sheep_01',
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      earTagNumber: 'DZ-16-5120',
      species: 'Ovine',
      breed: 'Ouled Djellal Pure Race',
      gender: 'Male',
      birthDate: '2024-03-05',
      healthStatus: 'Healthy',
      notes: 'Bélier reproducteur souche steppique.',
      createdAt: '2026-01-15T08:00:00Z',
    },
  ]);

  // Modals
  const [isParcelModalOpen, setIsParcelModalOpen] = useState(false);
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
  const [isWeighModalOpen, setIsWeighModalOpen] = useState(false);
  const [isLivestockModalOpen, setIsLivestockModalOpen] = useState(false);
  const [isPrintTicketModalOpen, setIsPrintTicketModalOpen] = useState(false);
  const [ticketToPrint, setTicketToPrint] = useState<AgriHarvestTicket | null>(null);

  // Form States
  const [newParcelForm, setNewParcelForm] = useState({
    name: '',
    surfaceHectares: 5.0,
    irrigationType: 'Drip' as AgriParcel['irrigationType'],
    soilType: 'Argilo-limoneux',
    currentCrop: '',
    plantingDate: new Date().toISOString().split('T')[0],
    expectedHarvestDate: '',
  });

  const [newTreatmentForm, setNewTreatmentForm] = useState({
    parcelId: 'parc_02',
    commercialProductName: '',
    activeIngredient: '',
    targetPestDisease: '',
    dosagePerHa: '2.0 kg/ha',
    darDays: 7,
    operatorName: 'Chef de Culture',
    notes: '',
  });

  const [newWeighForm, setNewWeighForm] = useState({
    parcelId: 'parc_02',
    cropDesignation: 'Tomates Maraîchères',
    vehiclePlate: '01234-126-16',
    driverName: 'Samir B.',
    grossWeightKg: 8500,
    tareWeightKg: 3200,
    cratesCount: 250,
    unitPriceDzdPerKg: 80,
    mandataireFeePercent: 6,
    destinationWholesaleMarket: 'Marché de Gros des Eucalyptus, Alger',
  });

  const [newLivestockForm, setNewLivestockForm] = useState({
    earTagNumber: 'DZ-16-0944',
    species: 'Bovine' as AgriLivestock['species'],
    breed: 'Montbéliarde',
    gender: 'Female' as AgriLivestock['gender'],
    birthDate: '2023-05-10',
    healthStatus: 'Healthy' as AgriLivestock['healthStatus'],
    dailyProductionLiters: 24,
    notes: 'Vaccination aphteuse et brucellose vérifiée.',
  });

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');

  // Stats
  const totalHectares = useMemo(() => {
    return parcels.reduce((acc, p) => acc + p.surfaceHectares, 0);
  }, [parcels]);

  const totalHarvestWeightKg = useMemo(() => {
    return harvestTickets.reduce((acc, t) => acc + t.netWeightKg, 0);
  }, [harvestTickets]);

  const totalFarmRevenueDzd = useMemo(() => {
    return harvestTickets.reduce((acc, t) => acc + t.netFarmPayoutDzd, 0);
  }, [harvestTickets]);

  const totalMilkDailyLiters = useMemo(() => {
    return livestock.reduce((acc, l) => acc + (l.dailyProductionLiters || 0), 0);
  }, [livestock]);

  // Actions
  const handleCreateParcel = () => {
    if (!newParcelForm.name) {
      showToast('Veuillez renseigner le nom de la parcelle', 'error');
      return;
    }

    const parcel: AgriParcel = {
      id: `parc_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      name: newParcelForm.name,
      surfaceHectares: Number(newParcelForm.surfaceHectares),
      irrigationType: newParcelForm.irrigationType,
      soilType: newParcelForm.soilType,
      currentCrop: newParcelForm.currentCrop || 'Friche / En jachère',
      plantingDate: newParcelForm.plantingDate,
      expectedHarvestDate: newParcelForm.expectedHarvestDate || undefined,
      status: newParcelForm.currentCrop ? 'Growing' : 'Fallow',
      createdAt: new Date().toISOString(),
    };

    setParcels([...parcels, parcel]);
    setIsParcelModalOpen(false);
    setNewParcelForm({
      name: '',
      surfaceHectares: 5.0,
      irrigationType: 'Drip',
      soilType: 'Argilo-limoneux',
      currentCrop: '',
      plantingDate: new Date().toISOString().split('T')[0],
      expectedHarvestDate: '',
    });
    showToast(`Parcelle ${parcel.name} enregistrée`, 'success');
  };

  const handleCreateTreatment = () => {
    if (!newTreatmentForm.commercialProductName) {
      showToast('Veuillez renseigner le nom commercial du produit', 'error');
      return;
    }

    const treatDate = new Date();
    const allowed = new Date(treatDate);
    allowed.setDate(allowed.getDate() + Number(newTreatmentForm.darDays));

    const log: AgriTreatmentLog = {
      id: `treat_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      parcelId: newTreatmentForm.parcelId,
      treatmentDate: treatDate.toISOString().split('T')[0],
      commercialProductName: newTreatmentForm.commercialProductName,
      activeIngredient: newTreatmentForm.activeIngredient || 'Matière active homologuée',
      targetPestDisease: newTreatmentForm.targetPestDisease || 'Traitement préventif',
      dosagePerHa: newTreatmentForm.dosagePerHa,
      darDays: Number(newTreatmentForm.darDays),
      harvestAllowedDate: allowed.toISOString().split('T')[0],
      operatorName: newTreatmentForm.operatorName,
      notes: newTreatmentForm.notes,
      createdAt: new Date().toISOString(),
    };

    setTreatmentLogs([log, ...treatmentLogs]);
    setIsTreatmentModalOpen(false);
    showToast(
      `Traitement phytosanitaire consigné. DAR: ${log.darDays} jours (Récolte interdite jusqu'au ${log.harvestAllowedDate})`,
      'success'
    );
  };

  const handleCreateWeighTicket = () => {
    const gross = Number(newWeighForm.grossWeightKg);
    const tare = Number(newWeighForm.tareWeightKg);
    const net = Math.max(0, gross - tare);

    if (net <= 0) {
      showToast('Le poids brut doit être strictement supérieur à la tare du véhicule', 'error');
      return;
    }

    // Check if parcel is under active DAR (Pre-harvest safety interval)
    const activeDarTreatment = treatmentLogs.find((t) => {
      if (t.parcelId !== newWeighForm.parcelId) return false;
      const allowed = new Date(t.harvestAllowedDate);
      const today = new Date();
      return today < allowed;
    });

    if (activeDarTreatment) {
      showToast(
        `ALERTE SÉCURITÉ ALIMENTAIRE : La parcelle sélectionnée est sous Délai Avant Récolte (DAR) jusqu'au ${activeDarTreatment.harvestAllowedDate} pour ${activeDarTreatment.commercialProductName}. Récolte interdite!`,
        'error'
      );
      return;
    }

    const price = Number(newWeighForm.unitPriceDzdPerKg);
    const totalGross = net * price;
    const feePercent = Number(newWeighForm.mandataireFeePercent);
    const mandataireFee = (totalGross * feePercent) / 100;
    const netFarmPayout = totalGross - mandataireFee;

    const seq = harvestTickets.length + 20;
    const ticketNum = `PES-2026-0${seq}`;

    const ticket: AgriHarvestTicket = {
      id: `pes_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      ticketNumber: ticketNum,
      parcelId: newWeighForm.parcelId,
      cropDesignation: newWeighForm.cropDesignation,
      vehiclePlate: newWeighForm.vehiclePlate,
      driverName: newWeighForm.driverName,
      grossWeightKg: gross,
      tareWeightKg: tare,
      netWeightKg: net,
      cratesCount: Number(newWeighForm.cratesCount),
      unitPriceDzdPerKg: price,
      totalGrossDzd: totalGross,
      mandataireFeePercent: feePercent,
      netFarmPayoutDzd: netFarmPayout,
      destinationWholesaleMarket: newWeighForm.destinationWholesaleMarket,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    setHarvestTickets([ticket, ...harvestTickets]);
    setIsWeighModalOpen(false);
    showToast(`Ticket Poids Public ${ticketNum} édité. Poids net : ${net.toLocaleString()} kg`, 'success');
  };

  const handleCreateLivestock = () => {
    if (!newLivestockForm.earTagNumber) {
      showToast('Veuillez renseigner le numéro d\'identification de boucle', 'error');
      return;
    }

    const animal: AgriLivestock = {
      id: `ls_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_agri',
      branchId: currentBranch?.id || 'branch_agri_main',
      staffId: currentUser?.id || 'staff_01',
      earTagNumber: newLivestockForm.earTagNumber,
      species: newLivestockForm.species,
      breed: newLivestockForm.breed,
      gender: newLivestockForm.gender,
      birthDate: newLivestockForm.birthDate,
      healthStatus: newLivestockForm.healthStatus,
      dailyProductionLiters: Number(newLivestockForm.dailyProductionLiters),
      notes: newLivestockForm.notes,
      createdAt: new Date().toISOString(),
    };

    setLivestock([animal, ...livestock]);
    setIsLivestockModalOpen(false);
    showToast(`Animal ${animal.earTagNumber} enregistré au registre vétérinaire`, 'success');
  };

  const handlePrintTicket = (ticket: AgriHarvestTicket) => {
    setTicketToPrint(ticket);
    setIsPrintTicketModalOpen(true);
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="flex-1 flex flex-col h-full bg-[#FAF9F5] dark:bg-neutral-950 overflow-hidden font-sans"
    >
      {/* Top Banner */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-lime-50 dark:bg-lime-950/60 text-lime-600 dark:text-lime-400 flex items-center justify-center font-bold shadow-sm border border-lime-200 dark:border-lime-800">
            <Sprout size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'المستثمرة الفلاحية، الإنتاج النباتي والحيواني' : 'Exploitation Agricole & Élevage'}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-lime-100 text-lime-800">
                FacilityType: 25
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Cadastre des parcelles et serres, traçabilité phytosanitaire (DAR), pont-bascule poids public et cheptel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsTreatmentModalOpen(true)}
            className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 text-neutral-700 dark:text-neutral-200 font-medium text-xs flex items-center gap-1.5 shadow-sm"
          >
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Cahier d'Épandage & DAR</span>
          </button>
          <button
            onClick={() => setIsWeighModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-lime-600 hover:bg-lime-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Scale size={15} />
            <span>Pesée Poids Public</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 flex items-center gap-6 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'border-lime-600 text-lime-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
          }`}
        >
          <Tractor size={15} />
          <span>Tableau du Domaine</span>
        </button>
        <button
          onClick={() => setActiveTab('parcels')}
          className={`py-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'parcels'
              ? 'border-lime-600 text-lime-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
          }`}
        >
          <Wheat size={15} />
          <span>Parcelles & Serres ({parcels.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('crops')}
          className={`py-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'crops'
              ? 'border-lime-600 text-lime-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
          }`}
        >
          <Leaf size={15} />
          <span>Traitements Phytosanitaires (DAR)</span>
        </button>
        <button
          onClick={() => setActiveTab('harvest')}
          className={`py-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'harvest'
              ? 'border-lime-600 text-lime-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
          }`}
        >
          <Scale size={15} />
          <span>Pont-Bascule & Bons de Pesage</span>
        </button>
        <button
          onClick={() => setActiveTab('livestock')}
          className={`py-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'livestock'
              ? 'border-lime-600 text-lime-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
          }`}
        >
          <Layers size={15} />
          <span>Cheptel & Élevage ({livestock.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`py-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'finance'
              ? 'border-lime-600 text-lime-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
          }`}
        >
          <DollarSign size={15} />
          <span>Décomptes Mandataires de Gros</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between text-neutral-500 text-xs">
              <span>Superficie Totale Exploitation</span>
              <MapPin size={16} className="text-lime-600" />
            </div>
            <div className="text-2xl font-bold font-mono mt-1 text-lime-600">
              {totalHectares.toFixed(1)} <span className="text-sm font-normal">Hectares</span>
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              {parcels.length} parcelles & blocs de serres
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between text-neutral-500 text-xs">
              <span>Récoltes Pesées au Pont-Bascule</span>
              <Scale size={16} className="text-amber-600" />
            </div>
            <div className="text-2xl font-bold font-mono mt-1 text-amber-600">
              {(totalHarvestWeightKg / 1000).toFixed(2)} <span className="text-sm font-normal">Tonnes</span>
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              Expédiées vers marchés de gros & coopératives
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between text-neutral-500 text-xs">
              <span>Règlement Net Exploitant</span>
              <DollarSign size={16} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono mt-1 text-emerald-600">
              {formatMoney(totalFarmRevenueDzd, 'DZD')}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">Après déduction commission mandataires (6%)</div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between text-neutral-500 text-xs">
              <span>Production Laitière Quotidienne</span>
              <Droplets size={16} className="text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-mono mt-1 text-blue-600">
              {totalMilkDailyLiters.toFixed(1)} <span className="text-sm font-normal">L/jour</span>
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">Collecte laiterie conventionnée</div>
          </div>
        </div>

        {/* TAB 1: DOMAINE DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Parcels Overview */}
              <div className="lg:col-span-2 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Assolement & Occupation des Sols
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Surveillance de l'état végétatif et du calendrier cultural
                    </p>
                  </div>
                  <button
                    onClick={() => setIsParcelModalOpen(true)}
                    className="px-3 py-1.5 bg-lime-600 hover:bg-lime-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Nouvelle Parcelle</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {parcels.map((parcel) => (
                    <div
                      key={parcel.id}
                      onClick={() => setSelectedParcelId(parcel.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedParcelId === parcel.id
                          ? 'border-lime-500 bg-lime-50/30 dark:bg-lime-950/20 shadow-sm ring-1 ring-lime-500'
                          : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-xs text-neutral-900 dark:text-white line-clamp-1">
                          {parcel.name}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            parcel.status === 'Harvesting'
                              ? 'bg-amber-100 text-amber-800'
                              : parcel.status === 'Growing'
                              ? 'bg-lime-100 text-lime-800'
                              : 'bg-neutral-100 text-neutral-700'
                          }`}
                        >
                          {parcel.status === 'Harvesting' ? 'Récolte' : 'En Croissance'}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-300 font-medium">
                        {parcel.currentCrop}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 text-[11px] text-neutral-500">
                        <div>
                          <span>Superficie :</span>{' '}
                          <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                            {parcel.surfaceHectares} ha
                          </span>
                        </div>
                        <div>
                          <span>Irrigation :</span>{' '}
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                            {parcel.irrigationType}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Phytosanitary DAR Alert Box */}
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                    Délais Avant Récolte (DAR Actifs)
                  </h3>
                </div>

                <div className="space-y-3">
                  {treatmentLogs.map((log) => {
                    const today = new Date();
                    const allowed = new Date(log.harvestAllowedDate);
                    const isProtected = today < allowed;
                    return (
                      <div
                        key={log.id}
                        className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                          isProtected
                            ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900'
                            : 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-neutral-900 dark:text-white">
                            {log.commercialProductName}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isProtected
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                            }`}
                          >
                            {isProtected ? `DAR Actif (${log.darDays}j)` : 'Période Sécurisée'}
                          </span>
                        </div>

                        <div className="text-[11px] text-neutral-500">
                          Matière active : {log.activeIngredient}
                        </div>

                        <div className="flex justify-between items-center text-[11px] font-semibold pt-1">
                          <span>Récolte autorisée dès le :</span>
                          <span
                            className={
                              isProtected
                                ? 'text-rose-700 dark:text-rose-400 font-mono font-bold'
                                : 'text-emerald-700 dark:text-emerald-400 font-mono font-bold'
                            }
                          >
                            {log.harvestAllowedDate}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setIsTreatmentModalOpen(true)}
                  className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-300"
                >
                  Ajouter Traitement Phytosanitaire
                </button>
              </div>
            </div>

            {/* Recent Weighbridge Tickets */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Bons de Pesage Poids Public Récents
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Traçabilité tare, poids brut, prix unitaire au kilo et commission mandataire
                  </p>
                </div>
                <button
                  onClick={() => setIsWeighModalOpen(true)}
                  className="px-3 py-1.5 bg-lime-600 hover:bg-lime-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Nouvelle Pesée</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800 text-neutral-500 uppercase tracking-wider font-semibold text-[11px] border-b border-neutral-200 dark:border-neutral-700">
                    <tr>
                      <th className="px-4 py-3">N° Ticket</th>
                      <th className="px-4 py-3">Produit Récolté</th>
                      <th className="px-4 py-3">Véhicule / Chauffeur</th>
                      <th className="px-4 py-3 text-right">Poids Brut</th>
                      <th className="px-4 py-3 text-right">Tare</th>
                      <th className="px-4 py-3 text-right">Poids Net</th>
                      <th className="px-4 py-3 text-right">Prix/kg</th>
                      <th className="px-4 py-3 text-right">Net Exploitant</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {harvestTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                        <td className="px-4 py-3 font-mono font-bold text-lime-700 dark:text-lime-400">
                          {ticket.ticketNumber}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-neutral-900 dark:text-white">
                            {ticket.cropDesignation}
                          </div>
                          <div className="text-[11px] text-neutral-400">{ticket.date}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-neutral-800 dark:text-neutral-200">
                            {ticket.vehiclePlate}
                          </div>
                          <div className="text-[11px] text-neutral-500">{ticket.driverName}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-neutral-600 dark:text-neutral-400">
                          {ticket.grossWeightKg.toLocaleString()} kg
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-neutral-400">
                          {ticket.tareWeightKg.toLocaleString()} kg
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-amber-600">
                          {ticket.netWeightKg.toLocaleString()} kg
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-neutral-700 dark:text-neutral-300">
                          {ticket.unitPriceDzdPerKg} DA
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                          {formatMoney(ticket.netFarmPayoutDzd, 'DZD')}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => handlePrintTicket(ticket)}
                            className="px-2.5 py-1 bg-lime-50 hover:bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300 rounded font-medium text-[11px] inline-flex items-center gap-1"
                          >
                            <Printer size={12} />
                            <span>Imprimer</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PARCELS & GREENHOUSES */}
        {activeTab === 'parcels' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Registre Cadastral des Parcelles & Blocs de Serres
                </h3>
                <p className="text-xs text-neutral-500">
                  Superficies réelles, type de sol, système d'irrigation et dates de semis / récolte
                </p>
              </div>
              <button
                onClick={() => setIsParcelModalOpen(true)}
                className="px-3 py-1.5 bg-lime-600 hover:bg-lime-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={14} />
                <span>Ajouter Parcelle / Serre</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parcels.map((parcel) => (
                <div
                  key={parcel.id}
                  className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-neutral-900 dark:text-white">
                        {parcel.name}
                      </h4>
                      <p className="text-xs text-lime-700 dark:text-lime-400 font-semibold mt-0.5">
                        {parcel.currentCrop}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        parcel.status === 'Harvesting'
                          ? 'bg-amber-100 text-amber-800'
                          : parcel.status === 'Growing'
                          ? 'bg-lime-100 text-lime-800'
                          : 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {parcel.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                    <div>
                      <span className="text-neutral-400">Superficie :</span>
                      <div className="font-mono font-bold text-neutral-800 dark:text-neutral-200 mt-0.5">
                        {parcel.surfaceHectares} ha
                      </div>
                    </div>
                    <div>
                      <span className="text-neutral-400">Mode d'Irrigation :</span>
                      <div className="font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                        {parcel.irrigationType}
                      </div>
                    </div>
                    <div>
                      <span className="text-neutral-400">Nature du Sol :</span>
                      <div className="text-neutral-700 dark:text-neutral-300 mt-0.5">
                        {parcel.soilType}
                      </div>
                    </div>
                    <div>
                      <span className="text-neutral-400">Date de Plantation :</span>
                      <div className="font-mono text-neutral-700 dark:text-neutral-300 mt-0.5">
                        {parcel.plantingDate || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <span className="text-neutral-400">Récolte Estimée :</span>
                      <div className="font-mono text-neutral-700 dark:text-neutral-300 mt-0.5">
                        {parcel.expectedHarvestDate || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CROPS & PHYTOSANITARY */}
        {activeTab === 'crops' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Cahier Phytosanitaire & Respect du Délai Avant Récolte (DAR)
                </h3>
                <p className="text-xs text-neutral-500">
                  Consignation obligatoire des matières actives, doses par hectare et blocage de récolte avant expiration du DAR
                </p>
              </div>

              <button
                onClick={() => setIsTreatmentModalOpen(true)}
                className="px-3 py-1.5 bg-lime-600 hover:bg-lime-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={14} />
                <span>Nouveau Traitement</span>
              </button>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800 text-neutral-500 uppercase tracking-wider font-semibold text-[11px] border-b border-neutral-200 dark:border-neutral-700">
                    <tr>
                      <th className="px-4 py-3">Date Traitement</th>
                      <th className="px-4 py-3">Produit Commercial</th>
                      <th className="px-4 py-3">Matière Active</th>
                      <th className="px-4 py-3">Cible / Maladie</th>
                      <th className="px-4 py-3">Dosage / ha</th>
                      <th className="px-4 py-3 text-center">DAR (Jours)</th>
                      <th className="px-4 py-3 text-center">Date Fin DAR</th>
                      <th className="px-4 py-3">Opérateur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {treatmentLogs.map((log) => {
                      const today = new Date();
                      const allowed = new Date(log.harvestAllowedDate);
                      const isProtected = today < allowed;
                      return (
                        <tr key={log.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                          <td className="px-4 py-3 font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                            {log.treatmentDate}
                          </td>
                          <td className="px-4 py-3 font-bold text-neutral-900 dark:text-white">
                            {log.commercialProductName}
                          </td>
                          <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                            {log.activeIngredient}
                          </td>
                          <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                            {log.targetPestDisease}
                          </td>
                          <td className="px-4 py-3 font-mono">{log.dosagePerHa}</td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-amber-600">
                            {log.darDays} jours
                          </td>
                          <td className="px-4 py-3 text-center font-mono">
                            <span
                              className={`px-2 py-0.5 rounded font-bold ${
                                isProtected
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {log.harvestAllowedDate}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-neutral-500">{log.operatorName}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: WEIGHBRIDGE & HARVEST */}
        {activeTab === 'harvest' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Pont-Bascule & Bons de Pesage Officiels
                </h3>
                <p className="text-xs text-neutral-500">
                  Calcul immédiat : Poids Brut - Tare = Poids Net, bordereau de transport et liquidations
                </p>
              </div>

              <button
                onClick={() => setIsWeighModalOpen(true)}
                className="px-3 py-1.5 bg-lime-600 hover:bg-lime-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={14} />
                <span>Nouveau Ticket Pesage</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {harvestTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scale size={18} className="text-lime-600" />
                      <span className="font-mono font-bold text-sm text-lime-700 dark:text-lime-400">
                        {ticket.ticketNumber}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-neutral-500">{ticket.date}</span>
                  </div>

                  <div className="border-t border-b border-neutral-100 dark:border-neutral-800 py-3 space-y-1.5 text-xs">
                    <div className="font-bold text-neutral-900 dark:text-white text-sm">
                      {ticket.cropDesignation}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Véhicule & Chauffeur :</span>
                      <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                        {ticket.vehiclePlate} ({ticket.driverName})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Destination :</span>
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {ticket.destinationWholesaleMarket}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Nombre de Caisses :</span>
                      <span className="font-mono">{ticket.cratesCount || 'Vrac'} caisses</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 font-mono">
                    <div>
                      <div className="text-[10px] text-neutral-400">Brut</div>
                      <div className="font-bold">{ticket.grossWeightKg.toLocaleString()} kg</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-400">Tare</div>
                      <div className="text-neutral-500">{ticket.tareWeightKg.toLocaleString()} kg</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-400">Net Facturé</div>
                      <div className="font-bold text-lime-600">
                        {ticket.netWeightKg.toLocaleString()} kg
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 text-xs">
                    <div>
                      <span className="text-neutral-400">Net Exploitant :</span>
                      <div className="font-mono font-bold text-sm text-emerald-600">
                        {formatMoney(ticket.netFarmPayoutDzd, 'DZD')}
                      </div>
                    </div>
                    <button
                      onClick={() => handlePrintTicket(ticket)}
                      className="px-3 py-1.5 bg-lime-50 hover:bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Printer size={13} />
                      <span>Ticket & Bon Transport</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: LIVESTOCK & CHEPTEL */}
        {activeTab === 'livestock' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Registre Zootechnique & Sanitaire du Cheptel
                </h3>
                <p className="text-xs text-neutral-500">
                  Numéros de boucle d'identification officielle, suivi vaccinal, races et production laitière
                </p>
              </div>

              <button
                onClick={() => setIsLivestockModalOpen(true)}
                className="px-3 py-1.5 bg-lime-600 hover:bg-lime-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={14} />
                <span>Ajouter Animal</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {livestock.map((animal) => (
                <div
                  key={animal.id}
                  className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-lime-100 text-lime-800">
                        {animal.earTagNumber}
                      </span>
                      <h4 className="font-bold text-sm text-neutral-900 dark:text-white mt-1.5">
                        {animal.breed}
                      </h4>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        animal.healthStatus === 'Healthy'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {animal.healthStatus}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Espèce / Sexe :</span>
                      <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                        {animal.species} ({animal.gender === 'Female' ? 'Femelle' : 'Mâle'})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Date Naissance :</span>
                      <span className="font-mono text-neutral-600 dark:text-neutral-400">
                        {animal.birthDate}
                      </span>
                    </div>
                    {animal.dailyProductionLiters !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Production Lait / Jour :</span>
                        <span className="font-mono font-bold text-blue-600">
                          {animal.dailyProductionLiters} L / jour
                        </span>
                      </div>
                    )}
                  </div>

                  {animal.notes && (
                    <div className="pt-2 text-[11px] text-neutral-500 bg-neutral-50 dark:bg-neutral-800/40 p-2 rounded-lg">
                      {animal.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: FINANCE & WHOLESALE SETTLEMENTS */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-xs text-neutral-500">Chiffre d'Affaires Brut Récoltes</div>
                <div className="text-xl font-bold font-mono mt-1 text-neutral-900 dark:text-white">
                  {formatMoney(
                    harvestTickets.reduce((acc, t) => acc + t.totalGrossDzd, 0),
                    'DZD'
                  )}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">Valeur marchande brute au carreau</div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-xs text-neutral-500">Commissions Mandataires Déduites (6%)</div>
                <div className="text-xl font-bold font-mono mt-1 text-amber-600">
                  {formatMoney(
                    harvestTickets.reduce((acc, t) => acc + (t.totalGrossDzd * t.mandataireFeePercent) / 100, 0),
                    'DZD'
                  )}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">Frais d'intermédiation des mandataires</div>
              </div>

              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="text-xs text-neutral-500">Règlement Net Domaine Agricole</div>
                <div className="text-xl font-bold font-mono mt-1 text-emerald-600">
                  {formatMoney(totalFarmRevenueDzd, 'DZD')}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">Montant crédité sur compte exploitation</div>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Décomptes de Liquidation des Ventes aux Marchés de Gros
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800 text-neutral-500 uppercase tracking-wider font-semibold text-[11px] border-b border-neutral-200 dark:border-neutral-700">
                    <tr>
                      <th className="px-4 py-3">Réf Ticket</th>
                      <th className="px-4 py-3">Marché Mandataire</th>
                      <th className="px-4 py-3 text-right">Poids Net</th>
                      <th className="px-4 py-3 text-right">Prix Unitaire</th>
                      <th className="px-4 py-3 text-right">Brut Vente</th>
                      <th className="px-4 py-3 text-right">Commission (6%)</th>
                      <th className="px-4 py-3 text-right">Net Exploit. (DZD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono">
                    {harvestTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
                        <td className="px-4 py-3 font-bold text-lime-700 dark:text-lime-400">
                          {t.ticketNumber}
                        </td>
                        <td className="px-4 py-3 font-sans text-neutral-800 dark:text-neutral-200">
                          {t.destinationWholesaleMarket}
                        </td>
                        <td className="px-4 py-3 text-right">{t.netWeightKg.toLocaleString()} kg</td>
                        <td className="px-4 py-3 text-right">{t.unitPriceDzdPerKg} DA</td>
                        <td className="px-4 py-3 text-right text-neutral-700 dark:text-neutral-300">
                          {formatMoney(t.totalGrossDzd, 'DZD')}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-600">
                          -{formatMoney((t.totalGrossDzd * t.mandataireFeePercent) / 100, 'DZD')}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">
                          {formatMoney(t.netFarmPayoutDzd, 'DZD')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: NEW PARCEL */}
      {isParcelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Wheat className="text-lime-600" size={20} />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Nouvelle Parcelle / Serre Agricole
                </h3>
              </div>
              <button
                onClick={() => setIsParcelModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-500 font-medium mb-1">Nom / Numéro Parcelle</label>
                <input
                  type="text"
                  placeholder="Ex: Parcelle Ouest 12 - Maraîchage Plein Champ"
                  value={newParcelForm.name}
                  onChange={(e) => setNewParcelForm({ ...newParcelForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Superficie (Hectares)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newParcelForm.surfaceHectares}
                    onChange={(e) =>
                      setNewParcelForm({ ...newParcelForm, surfaceHectares: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Système d'Irrigation</label>
                  <select
                    value={newParcelForm.irrigationType}
                    onChange={(e) =>
                      setNewParcelForm({
                        ...newParcelForm,
                        irrigationType: e.target.value as AgriParcel['irrigationType'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  >
                    <option value="Drip">Goutte-à-goutte (Drip)</option>
                    <option value="Pivot">Pivot d'irrigation</option>
                    <option value="Sprinkler">Aspersion</option>
                    <option value="Gravity">Gravitaire</option>
                    <option value="Rainfed">Pluvial / Bour</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Culture En Place</label>
                  <input
                    type="text"
                    placeholder="Ex: Pomme de terre Spunta"
                    value={newParcelForm.currentCrop}
                    onChange={(e) =>
                      setNewParcelForm({ ...newParcelForm, currentCrop: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Type de Sol</label>
                  <input
                    type="text"
                    value={newParcelForm.soilType}
                    onChange={(e) =>
                      setNewParcelForm({ ...newParcelForm, soilType: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Date Semis / Plantation</label>
                  <input
                    type="date"
                    value={newParcelForm.plantingDate}
                    onChange={(e) =>
                      setNewParcelForm({ ...newParcelForm, plantingDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Date Récolte Estimée</label>
                  <input
                    type="date"
                    value={newParcelForm.expectedHarvestDate}
                    onChange={(e) =>
                      setNewParcelForm({ ...newParcelForm, expectedHarvestDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => setIsParcelModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateParcel}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-lime-600 hover:bg-lime-700 text-white shadow-sm"
              >
                Enregistrer Parcelle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: NEW PHYTOSANITARY TREATMENT */}
      {isTreatmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-emerald-600" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Consignation Phytosanitaire & DAR
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Calcul automatique du Délai Avant Récolte pour la sécurité consommateur
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTreatmentModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-500 font-medium mb-1">Parcelle Ciblée</label>
                <select
                  value={newTreatmentForm.parcelId}
                  onChange={(e) =>
                    setNewTreatmentForm({ ...newTreatmentForm, parcelId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                >
                  {parcels.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.currentCrop})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Produit Commercial</label>
                  <input
                    type="text"
                    placeholder="Ex: Score 250 EC"
                    value={newTreatmentForm.commercialProductName}
                    onChange={(e) =>
                      setNewTreatmentForm({
                        ...newTreatmentForm,
                        commercialProductName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Matière Active</label>
                  <input
                    type="text"
                    placeholder="Ex: Difénoconazole 250g/l"
                    value={newTreatmentForm.activeIngredient}
                    onChange={(e) =>
                      setNewTreatmentForm({
                        ...newTreatmentForm,
                        activeIngredient: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Cible Pathogène / Ravageur</label>
                  <input
                    type="text"
                    placeholder="Ex: Tavelure, Mildiou, Mineuse"
                    value={newTreatmentForm.targetPestDisease}
                    onChange={(e) =>
                      setNewTreatmentForm({
                        ...newTreatmentForm,
                        targetPestDisease: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Dose / Hectare</label>
                  <input
                    type="text"
                    value={newTreatmentForm.dosagePerHa}
                    onChange={(e) =>
                      setNewTreatmentForm({ ...newTreatmentForm, dosagePerHa: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-rose-800 dark:text-rose-200">
                    Délai Avant Récolte Obligatoire (DAR) :
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={newTreatmentForm.darDays}
                      onChange={(e) =>
                        setNewTreatmentForm({
                          ...newTreatmentForm,
                          darDays: Number(e.target.value),
                        })
                      }
                      className="w-16 px-2 py-1 bg-white dark:bg-neutral-800 border border-rose-300 rounded text-center font-mono font-bold text-rose-700"
                    />
                    <span className="font-semibold text-rose-800">Jours</span>
                  </div>
                </div>
                <p className="text-[11px] text-rose-600 dark:text-rose-400">
                  Le système bloquera automatiquement toute pesée ou émission de bon de transport sur cette parcelle avant l'expiration du DAR.
                </p>
              </div>

              <div>
                <label className="block text-neutral-500 font-medium mb-1">Opérateur Responsable</label>
                <input
                  type="text"
                  value={newTreatmentForm.operatorName}
                  onChange={(e) =>
                    setNewTreatmentForm({ ...newTreatmentForm, operatorName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => setIsTreatmentModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateTreatment}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                Valider Traitement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: NEW WEIGHBRIDGE TICKET */}
      {isWeighModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Scale className="text-lime-600" size={20} />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Ticket de Pesage Pont-Bascule (Poids Public)
                </h3>
              </div>
              <button
                onClick={() => setIsWeighModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Parcelle d'Origine</label>
                  <select
                    value={newWeighForm.parcelId}
                    onChange={(e) =>
                      setNewWeighForm({ ...newWeighForm, parcelId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  >
                    {parcels.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Produit / Calibre</label>
                  <input
                    type="text"
                    value={newWeighForm.cropDesignation}
                    onChange={(e) =>
                      setNewWeighForm({ ...newWeighForm, cropDesignation: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Matricule Camion</label>
                  <input
                    type="text"
                    value={newWeighForm.vehiclePlate}
                    onChange={(e) =>
                      setNewWeighForm({ ...newWeighForm, vehiclePlate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Chauffeur Transporteur</label>
                  <input
                    type="text"
                    value={newWeighForm.driverName}
                    onChange={(e) =>
                      setNewWeighForm({ ...newWeighForm, driverName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
              </div>

              {/* Weight calculation block */}
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-neutral-500 font-medium mb-1">Poids Brut (kg)</label>
                    <input
                      type="number"
                      value={newWeighForm.grossWeightKg}
                      onChange={(e) =>
                        setNewWeighForm({
                          ...newWeighForm,
                          grossWeightKg: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-500 font-medium mb-1">Tare Véhicule (kg)</label>
                    <input
                      type="number"
                      value={newWeighForm.tareWeightKg}
                      onChange={(e) =>
                        setNewWeighForm({
                          ...newWeighForm,
                          tareWeightKg: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono text-neutral-500"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Poids Net Automatique :
                  </span>
                  <span className="text-base font-mono font-bold text-lime-600">
                    {Math.max(
                      0,
                      newWeighForm.grossWeightKg - newWeighForm.tareWeightKg
                    ).toLocaleString()}{' '}
                    kg
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Prix Unitaire / kg (DZD)</label>
                  <input
                    type="number"
                    value={newWeighForm.unitPriceDzdPerKg}
                    onChange={(e) =>
                      setNewWeighForm({
                        ...newWeighForm,
                        unitPriceDzdPerKg: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Commission Mandataire (%)</label>
                  <input
                    type="number"
                    value={newWeighForm.mandataireFeePercent}
                    onChange={(e) =>
                      setNewWeighForm({
                        ...newWeighForm,
                        mandataireFeePercent: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-500 font-medium mb-1">Marché de Gros Destinataire</label>
                <input
                  type="text"
                  value={newWeighForm.destinationWholesaleMarket}
                  onChange={(e) =>
                    setNewWeighForm({
                      ...newWeighForm,
                      destinationWholesaleMarket: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => setIsWeighModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateWeighTicket}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-lime-600 hover:bg-lime-700 text-white shadow-sm flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Valider Pesée & Sortie</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: NEW LIVESTOCK */}
      {isLivestockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Layers className="text-lime-600" size={20} />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Nouvel Animal au Cheptel
                </h3>
              </div>
              <button
                onClick={() => setIsLivestockModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">N° Boucle Officielle</label>
                  <input
                    type="text"
                    value={newLivestockForm.earTagNumber}
                    onChange={(e) =>
                      setNewLivestockForm({ ...newLivestockForm, earTagNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Espèce</label>
                  <select
                    value={newLivestockForm.species}
                    onChange={(e) =>
                      setNewLivestockForm({
                        ...newLivestockForm,
                        species: e.target.value as AgriLivestock['species'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  >
                    <option value="Bovine">Bovin (Vache / Génisse / Veau)</option>
                    <option value="Ovine">Ovin (Mouton / Brebis / Agneau)</option>
                    <option value="Caprine">Caprin (Chèvre)</option>
                    <option value="Poultry">Volaille (Poulet / Pondeuse)</option>
                    <option value="Equine">Équin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Race</label>
                  <input
                    type="text"
                    placeholder="Ex: Holstein, Montbéliarde, Ouled Djellal"
                    value={newLivestockForm.breed}
                    onChange={(e) =>
                      setNewLivestockForm({ ...newLivestockForm, breed: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Sexe</label>
                  <select
                    value={newLivestockForm.gender}
                    onChange={(e) =>
                      setNewLivestockForm({
                        ...newLivestockForm,
                        gender: e.target.value as AgriLivestock['gender'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  >
                    <option value="Female">Femelle</option>
                    <option value="Male">Mâle</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Date de Naissance</label>
                  <input
                    type="date"
                    value={newLivestockForm.birthDate}
                    onChange={(e) =>
                      setNewLivestockForm({ ...newLivestockForm, birthDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Production Laitière (L/j)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newLivestockForm.dailyProductionLiters}
                    onChange={(e) =>
                      setNewLivestockForm({
                        ...newLivestockForm,
                        dailyProductionLiters: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-500 font-medium mb-1">Notes Vétérinaires & Vaccins</label>
                <textarea
                  rows={2}
                  value={newLivestockForm.notes}
                  onChange={(e) =>
                    setNewLivestockForm({ ...newLivestockForm, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => setIsLivestockModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateLivestock}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-lime-600 hover:bg-lime-700 text-white shadow-sm"
              >
                Enregistrer Animal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: PRINTABLE TICKET & BON DE TRANSPORT AGRICOLE */}
      {isPrintTicketModalOpen && ticketToPrint && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-neutral-900 rounded-2xl max-w-xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto font-sans print:p-0 print:shadow-none">
            <div className="flex items-center justify-between pb-4 border-b-2 border-neutral-900 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="text-lime-600" size={20} />
                <span className="font-bold text-sm">Ticket Officiel Pont-Bascule & Bon de Transport</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-lime-600 hover:bg-lime-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer size={14} />
                  <span>Imprimer</span>
                </button>
                <button
                  onClick={() => setIsPrintTicketModalOpen(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b border-neutral-300 pb-3">
                <div>
                  <h2 className="text-sm font-extrabold tracking-tight uppercase">
                    RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE
                  </h2>
                  <p className="text-xs font-bold text-neutral-700">
                    EXPLOITATION AGRICOLE ATRIUM AGRI
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Agrément Ministère de l'Agriculture & du Développement Rural
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-lime-700">
                    {ticketToPrint.ticketNumber}
                  </div>
                  <div className="text-xs text-neutral-500">Date : {ticketToPrint.date}</div>
                </div>
              </div>

              <div className="text-center font-extrabold text-sm uppercase bg-neutral-100 py-1.5 rounded">
                BON DE PESAGE POIDS PUBLIC & TRANSPORT AGRICOLE
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs p-3 border border-neutral-200 rounded-lg">
                <div>
                  <span className="text-neutral-400">Désignation du Produit :</span>
                  <div className="font-bold text-sm text-neutral-900 mt-0.5">
                    {ticketToPrint.cropDesignation}
                  </div>
                </div>
                <div>
                  <span className="text-neutral-400">Marché de Destination :</span>
                  <div className="font-semibold text-neutral-800 mt-0.5">
                    {ticketToPrint.destinationWholesaleMarket}
                  </div>
                </div>
                <div>
                  <span className="text-neutral-400">Matricule Véhicule :</span>
                  <div className="font-mono font-bold text-neutral-900 mt-0.5">
                    {ticketToPrint.vehiclePlate}
                  </div>
                </div>
                <div>
                  <span className="text-neutral-400">Nom du Conducteur :</span>
                  <div className="font-semibold text-neutral-800 mt-0.5">
                    {ticketToPrint.driverName}
                  </div>
                </div>
              </div>

              <div className="border border-neutral-300 rounded-lg overflow-hidden text-xs">
                <table className="w-full">
                  <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-300">
                    <tr>
                      <th className="px-3 py-2 text-left">Métrés & Pesées Pont-Bascule</th>
                      <th className="px-3 py-2 text-right">Valeur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 font-mono">
                    <tr>
                      <td className="px-3 py-2 font-sans">1. Poids Brut du Véhicule Chargé</td>
                      <td className="px-3 py-2 text-right font-bold">
                        {ticketToPrint.grossWeightKg.toLocaleString()} kg
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-sans">2. Tare du Véhicule à Vide</td>
                      <td className="px-3 py-2 text-right text-neutral-500">
                        -{ticketToPrint.tareWeightKg.toLocaleString()} kg
                      </td>
                    </tr>
                    <tr className="bg-lime-50/60 font-bold">
                      <td className="px-3 py-2 font-sans text-lime-900">
                        3. Poids Net de la Récolte Expédiée
                      </td>
                      <td className="px-3 py-2 text-right text-lime-800 text-sm">
                        {ticketToPrint.netWeightKg.toLocaleString()} kg
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-sans">4. Prix Unitaire Convenu / kg</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {ticketToPrint.unitPriceDzdPerKg} DZD / kg
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-sans">5. Montant Brut Total de la Vente</td>
                      <td className="px-3 py-2 text-right font-bold">
                        {formatMoney(ticketToPrint.totalGrossDzd, 'DZD')}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-sans">
                        6. Commission Mandataire ({ticketToPrint.mandataireFeePercent}%)
                      </td>
                      <td className="px-3 py-2 text-right text-amber-700">
                        -{formatMoney((ticketToPrint.totalGrossDzd * ticketToPrint.mandataireFeePercent) / 100, 'DZD')}
                      </td>
                    </tr>
                    <tr className="bg-neutral-100 font-extrabold text-sm border-t-2 border-neutral-900">
                      <td className="px-3 py-2.5 font-sans uppercase">
                        NET À PAYER À L'EXPLOITANT AGRICOLE
                      </td>
                      <td className="px-3 py-2.5 text-right text-emerald-700">
                        {formatMoney(ticketToPrint.netFarmPayoutDzd, 'DZD')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-300 text-xs text-center">
                <div className="border border-neutral-300 rounded-lg p-3 h-24 flex flex-col justify-between">
                  <div className="font-bold">Le Chef de Culture / Peseur</div>
                  <div className="text-[10px] text-neutral-400">Visa & Cachet Poids Public</div>
                </div>
                <div className="border border-neutral-300 rounded-lg p-3 h-24 flex flex-col justify-between">
                  <div className="font-bold">Le Chauffeur Réceptionnaire</div>
                  <div className="text-[10px] text-neutral-400">Signature Prise en Charge</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

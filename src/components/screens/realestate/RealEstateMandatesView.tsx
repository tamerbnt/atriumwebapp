import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Printer,
  ShieldCheck,
  Share2,
  Calendar,
  Building,
  DollarSign,
  ChevronRight,
  RefreshCw,
  X,
  Eye,
} from 'lucide-react';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { FilterCapsules } from '../../ui/FilterCapsules';
import { UniversalDataCollection } from '../../ui/collection/UniversalDataCollection';
import { ActionButtonDef } from '../../ui/collection/CollectionListRow';
import { MandateModal } from './MandateModal';
import { useRealEstateData } from './realEstateData';
import { RealEstateMandate } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { useAtriumStore, showToast } from '../../../services/store';

export const RealEstateMandatesView: React.FC = () => {
  const { language } = useAtriumStore();
  const isAr = language === 'ar';
  const { mandates, properties, addMandate, updateMandate } = useRealEstateData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isMandateModalOpen, setIsMandateModalOpen] = useState(false);
  const [selectedMandate, setSelectedMandate] = useState<RealEstateMandate | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filtered mandates
  const filteredMandates = useMemo(() => {
    return mandates.filter((m) => {
      const matchesSearch =
        m.mandateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.ownerFullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'active') return m.status === 'Active';
      if (statusFilter === 'expiring') return m.status === 'Expiring';
      if (statusFilter === 'exclusive') return m.isExclusive;
      return true;
    });
  }, [mandates, searchQuery, statusFilter]);

  const handleOpenDrawer = (mandate: RealEstateMandate) => {
    setSelectedMandate(mandate);
    setIsDrawerOpen(true);
  };

  const handleProrogation = (mandate: RealEstateMandate) => {
    const start = new Date(mandate.endDate);
    start.setMonth(start.getMonth() + 3);
    const newEnd = start.toISOString().split('T')[0];

    const updated: RealEstateMandate = {
      ...mandate,
      status: 'Active',
      endDate: newEnd,
      renewalCount: mandate.renewalCount + 1,
      notes: `${mandate.notes || ''} [Prorogation de 3 mois validée le ${new Date().toLocaleDateString()}]`,
      updatedAt: new Date().toISOString(),
    };
    updateMandate(updated);
    if (selectedMandate?.id === mandate.id) {
      setSelectedMandate(updated);
    }
    showToast(
      isAr
        ? `تم تمديد الوكالة ${mandate.mandateNumber} لـ 3 أشهر إضافية`
        : `Avenant validé: Mandat ${mandate.mandateNumber} prorogé de 3 mois jusqu'au ${newEnd}`,
      'success'
    );
  };

  // Metrics
  const activeCount = mandates.filter((m) => m.status === 'Active').length;
  const expiringCount = mandates.filter((m) => m.status === 'Expiring').length;
  const exclusiveCount = mandates.filter((m) => m.isExclusive).length;
  const totalVolumeDzd = mandates.reduce((sum, m) => sum + m.askingPriceDzd, 0);

  const getCustomActions = (item: RealEstateMandate): ActionButtonDef[] => [
    {
      label: isAr ? 'معاينة الوكالة' : 'Consulter Fiche Mandat',
      icon: <Eye size={14} />,
      onClick: () => handleOpenDrawer(item),
    },
    {
      label: isAr ? 'تمديد 3 أشهر' : 'Proroger 3 mois',
      icon: <Clock size={14} />,
      onClick: () => handleProrogation(item),
    },
    {
      label: isAr ? 'طباعة العقد' : 'Imprimer Mandat',
      icon: <Printer size={14} />,
      onClick: () => {
        showToast(
          isAr
            ? `جاري طباعة عقد الوكالة ${item.mandateNumber}...`
            : `Impression du mandat ${item.mandateNumber}...`,
          'info'
        );
        if (typeof window !== 'undefined') window.print();
      },
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Elevated Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 p-6 rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800/60 shadow-2xs space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold shadow-sm">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                  {isAr ? 'سجل الوكالات والوساطة العقارية' : "Registre des Mandats d'Agence"}
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  Décret 09-18 Conforme
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isAr
                  ? 'ترقيم تسلسلي إلزامي، متابعة الآجال، وتطبيق نسب الأتعاب القانونية'
                  : "Enregistrement séquentiel légal, suivi d'expiration et honoraires réglementés"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={isAr ? 'بحث بالرقم أو العقار...' : 'Rechercher mandat, N° MND, mandant...'}
            />

            <AtriumButton
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => setIsMandateModalOpen(true)}
            >
              {isAr ? 'تحرير وكالة جديدة' : 'Nouveau Mandat'}
            </AtriumButton>
          </div>
        </div>

        {/* 4 Metric Pods */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase font-semibold">
              {isAr ? 'وكالات سارية' : 'Mandats Actifs'}
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-1 font-mono">
              {activeCount}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
              {isAr ? 'قيد الاستغلال' : "En cours d'exploitation"}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase font-semibold">
              {isAr ? 'تنتهي خلال 15 يوماً' : 'Expirant sous 15j'}
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-500 mt-1 font-mono">
              {expiringCount}
            </div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
              {isAr ? 'يتطلب ملحق تمديد' : 'Avenant de prorogation requis'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase font-semibold">
              {isAr ? 'وكالات حصرية' : 'Mandats Exclusifs'}
            </div>
            <div className="text-2xl font-bold text-[#C4785A] mt-1 font-mono">
              {exclusiveCount}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
              {isAr ? 'حق الوساطة الحصري' : 'Portefeuille sous exclusivité'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#1F1D1B] border border-neutral-800 text-white shadow-sm">
            <div className="text-xs text-neutral-400 uppercase font-semibold">
              {isAr ? 'قيمة المحفظة' : 'Valeur Portefeuille'}
            </div>
            <div className="text-2xl font-bold text-white mt-1 font-mono">
              {formatMoney(totalVolumeDzd, language)}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">
              {isAr ? 'إجمالي الأصول تحت الوكالة' : 'Volume total sous mandat'}
            </div>
          </div>
        </div>

        {/* Filter Capsules */}
        <FilterCapsules
          activeKey={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: isAr ? 'جميع الوكالات' : 'Tous les Mandats', key: 'all', count: mandates.length },
            { label: isAr ? 'سارية' : 'Actifs', key: 'active', count: activeCount },
            { label: isAr ? 'تنتهي قريباً' : 'Expirant Bientôt', key: 'expiring', count: expiringCount },
            { label: isAr ? 'حصرية' : 'Exclusifs', key: 'exclusive', count: exclusiveCount },
          ]}
        />

        {/* UniversalDataCollection List & Grid */}
        <UniversalDataCollection<RealEstateMandate>
          items={filteredMandates}
          keyExtractor={(m) => m.id}
          title={isAr ? 'سجل الوكالات القانوني' : 'Registre des Mandats'}
          subtitle={isAr ? 'مطابق لأحكام المرسوم التنفيذي 09-18' : 'Suivi conforme au Décret exécutif n° 09-18'}
          searchPlaceholder={isAr ? 'بحث برقم الوكالة MND...' : 'Rechercher par N° MND...'}
          defaultViewMode="list"
          onSelectRow={(item) => handleOpenDrawer(item)}
          customActions={(item) => getCustomActions(item)}
          columns={[
            {
              id: 'mandate',
              header: isAr ? 'رقم الوكالة والعقار' : 'N° Mandat & Bien',
              renderCell: (m: RealEstateMandate) => (
                <div>
                  <div className="font-mono font-bold text-xs text-[#C4785A] flex items-center gap-1.5">
                    <span>{m.mandateNumber}</span>
                    {m.isExclusive && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-[#C4785A]/15 text-[#C4785A]">
                        Exclusif
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-white truncate max-w-xs mt-0.5">
                    {m.propertyTitle}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {m.propertyAddress}
                  </div>
                </div>
              ),
            },
            {
              id: 'owner',
              header: isAr ? 'الموكل (المالك)' : 'Mandant (Propriétaire)',
              renderCell: (m: RealEstateMandate) => (
                <div className="text-xs">
                  <div className="font-semibold text-neutral-900 dark:text-white">{m.ownerFullName}</div>
                  <div className="text-neutral-500 dark:text-neutral-400 font-mono">{m.ownerPhone}</div>
                  <div className="text-[11px] text-neutral-400">CNI: {m.ownerNationalId}</div>
                </div>
              ),
            },
            {
              id: 'price',
              header: isAr ? 'السعر المطلوب' : 'Type & Prix Demandé',
              sortable: true,
              renderCell: (m: RealEstateMandate) => (
                <div className="text-xs">
                  <div className="font-mono font-bold text-sm text-neutral-900 dark:text-white">
                    {formatMoney(m.askingPriceDzd, language)}
                  </div>
                  <div className="text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {m.mandateType.replace('_', ' ')} · {m.listingType === 'Sale' ? 'Vente' : 'Location'}
                  </div>
                </div>
              ),
            },
            {
              id: 'commission',
              header: isAr ? 'أتعاب الوكالة' : 'Honoraires Agence (TTC)',
              sortable: true,
              renderCell: (m: RealEstateMandate) => (
                <div className="text-xs">
                  <div className="font-mono font-bold text-[#C4785A]">
                    {formatMoney(m.commissionEstimatedTtcDzd, language)}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {m.commissionCalculationMode === 'DecreeTranches'
                      ? 'Barème Décret 09-18'
                      : `${m.commissionRatePercent}% Négocié`}
                  </div>
                </div>
              ),
            },
            {
              id: 'validity',
              header: isAr ? 'المدة والصلاحية' : 'Période & Validité',
              renderCell: (m: RealEstateMandate) => (
                <div className="text-xs">
                  <div className="text-neutral-900 dark:text-white flex items-center gap-1 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Jusqu'au {m.endDate}</span>
                  </div>
                  {m.status === 'Expiring' ? (
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Expire sous 15 jours</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                      <CheckCircle className="w-3 h-3" />
                      <span>En cours de validité</span>
                    </span>
                  )}
                </div>
              ),
            },
            {
              id: 'negotiator',
              header: isAr ? 'الوكيل المفاوض' : 'Négociateur',
              renderCell: (m: RealEstateMandate) => (
                <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                  {m.negotiatorName || 'Karim Zerrouki'}
                </div>
              ),
            },
          ]}
          renderCard={(m: RealEstateMandate) => (
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/60 bg-white dark:bg-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-[#C4785A]">
                  {m.mandateNumber}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    m.status === 'Expiring'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {m.status}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                  {m.propertyTitle}
                </h4>
                <p className="text-xs text-neutral-500 truncate">{m.ownerFullName} • {m.ownerPhone}</p>
              </div>
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-neutral-400 block">Prix Demandé</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-white">
                    {formatMoney(m.askingPriceDzd, language)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 block">Com. TTC (09-18)</span>
                  <span className="font-mono font-bold text-[#C4785A]">
                    {formatMoney(m.commissionEstimatedTtcDzd, language)}
                  </span>
                </div>
              </div>
            </div>
          )}
        />
      </div>

      {/* Slide-Over Inspector Drawer (390px) */}
      {isDrawerOpen && selectedMandate && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[420px] bg-white dark:bg-neutral-850 shadow-2xl border-l border-neutral-200 dark:border-neutral-800 p-6 overflow-y-auto flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
              <div>
                <span className="text-[11px] font-mono font-bold text-[#C4785A]">
                  {selectedMandate.mandateNumber}
                </span>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  {isAr ? 'تفاصيل الوكالة القانونية' : 'Détail du Mandat Légal'}
                </h3>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status & Exclusivity Banner */}
            <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-800/60 border border-[#EDF1F3] dark:border-neutral-700/60 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500 dark:text-neutral-400">Statut Juridique:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {selectedMandate.status === 'Active' ? 'Actif & Conforme' : selectedMandate.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500 dark:text-neutral-400">Régime:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {selectedMandate.isExclusive ? 'Exclusivité Totale (3 Mois)' : 'Mandat Simple'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500 dark:text-neutral-400">Renouvellements:</span>
                <span className="font-mono">{selectedMandate.renewalCount} avenant(s)</span>
              </div>
            </div>

            {/* Property Specs */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase text-[#C4785A]">Bien Sous Contrat</span>
              <div className="p-3.5 rounded-xl border border-[#E9EEF0] dark:border-neutral-700/60 text-xs space-y-1">
                <div className="font-bold text-neutral-900 dark:text-white">{selectedMandate.propertyTitle}</div>
                <div className="text-neutral-500 dark:text-neutral-400">{selectedMandate.propertyAddress}</div>
                <div className="pt-2 flex justify-between font-mono font-bold text-sm text-neutral-900 dark:text-white">
                  <span>Prix Demandé:</span>
                  <span>{formatMoney(selectedMandate.askingPriceDzd, language)}</span>
                </div>
                <div className="flex justify-between text-neutral-500 text-[11px]">
                  <span>Seuil Minimal Négociable:</span>
                  <span className="font-mono">{formatMoney(selectedMandate.minimumAcceptablePriceDzd, language)}</span>
                </div>
              </div>
            </div>

            {/* Owner Identity */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase text-[#C4785A]">Identité du Mandant</span>
              <div className="p-3.5 rounded-xl border border-[#E9EEF0] dark:border-neutral-700/60 text-xs space-y-1.5">
                <div className="font-semibold text-neutral-900 dark:text-white">{selectedMandate.ownerFullName}</div>
                <div className="text-neutral-500 font-mono">{selectedMandate.ownerPhone}</div>
                <div className="text-[11px] text-neutral-500">CNI / Passeport: <span className="font-mono font-semibold">{selectedMandate.ownerNationalId}</span></div>
                {selectedMandate.ownerIdIssueDate && (
                  <div className="text-[11px] text-neutral-400">Délivré le {selectedMandate.ownerIdIssueDate} à {selectedMandate.ownerIdIssueDaira}</div>
                )}
              </div>
            </div>

            {/* Commission Breakdown */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase text-[#C4785A]">Honoraires Réglementés</span>
              <div className="p-3.5 rounded-xl bg-[#FDF4F0] dark:bg-neutral-800 border border-[#C4785A]/30 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span>Base HT:</span>
                  <span className="font-mono font-semibold">{formatMoney(selectedMandate.commissionEstimatedHtDzd, language)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA Légale (19%):</span>
                  <span className="font-mono font-semibold">{formatMoney(Math.round(selectedMandate.commissionEstimatedHtDzd * 0.19), language)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#C4785A]/30 font-bold text-sm text-[#C4785A]">
                  <span>Total TTC Estimé:</span>
                  <span className="font-mono">{formatMoney(selectedMandate.commissionEstimatedTtcDzd, language)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Drawer Actions */}
          <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
            <AtriumButton
              variant="primary"
              className="w-full justify-center"
              icon={<Clock size={14} />}
              onClick={() => handleProrogation(selectedMandate)}
            >
              Proroger de 3 Mois (Avenant Décret 09-18)
            </AtriumButton>
            <AtriumButton
              variant="secondary"
              className="w-full justify-center"
              icon={<Printer size={14} />}
              onClick={() => {
                if (typeof window !== 'undefined') window.print();
              }}
            >
              Imprimer Contrat de Mandat
            </AtriumButton>
          </div>
        </div>
      )}

      {/* Creation Modal */}
      {isMandateModalOpen && (
        <MandateModal
          isOpen={isMandateModalOpen}
          onClose={() => setIsMandateModalOpen(false)}
          onSave={(newMnd) => addMandate(newMnd)}
          properties={properties}
        />
      )}
    </div>
  );
};

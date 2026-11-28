import React, { useState } from 'react';
import { Building, CheckCircle2, GraduationCap, HardHat, Palmtree, Plus, Users } from 'lucide-react';
import type {
  DevLot,
  DevProgram,
  DevVefaMilestone,
  RealEstateProperty,
  StudentHousingBed,
  SyndicAssembly,
  SyndicBuilding,
  SyndicFundCall,
  VacationRentalStay,
} from '../../../types/index';
import {
  allocateSyndicFundCallByTantiemes,
  evaluateSyndicAssemblyQuorum,
  formatRealEstateSequentialCode,
  validateVefaMilestones,
} from '../../../utils/realEstateDepth';
import { formatMoney } from '../../../utils/rules';
import {
  selectCurrentBranchFromState,
  selectCurrentBusinessFromState,
  shallowEqualObjects,
  showToast,
  useAtriumSelector,
} from '../../../services/store';
import { ScreenPod } from '../../ui/kinetic/ScreenPod';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { LiveSwitch } from '../../ui/live/LiveSwitch';

export interface RealEstateTradeModesPanelProps {
  properties: RealEstateProperty[];
  syndicBuildings: SyndicBuilding[];
  syndicFundCalls: SyndicFundCall[];
  syndicAssemblies: SyndicAssembly[];
  devPrograms: DevProgram[];
  devLots: DevLot[];
  studentBeds: StudentHousingBed[];
  vacationStays: VacationRentalStay[];
  onAddSyndicBuilding: (b: SyndicBuilding) => void;
  onIssueSyndicFundCall: (call: SyndicFundCall) => void;
  onRecordSyndicAssembly: (a: SyndicAssembly) => void;
  onAddDevProgram: (p: DevProgram) => void;
  onSaveDevLot: (lot: DevLot) => void;
  onSaveStudentBed: (bed: StudentHousingBed) => void;
  onSaveVacationStay: (stay: VacationRentalStay) => { ok: boolean; errorCode?: string; stay?: VacationRentalStay };
}

export const RealEstateTradeModesPanel: React.FC<RealEstateTradeModesPanelProps> = ({
  properties,
  syndicBuildings,
  syndicFundCalls,
  syndicAssemblies,
  devPrograms,
  devLots,
  studentBeds,
  vacationStays,
  onAddSyndicBuilding,
  onIssueSyndicFundCall,
  onRecordSyndicAssembly,
  onAddDevProgram,
  onSaveDevLot,
  onSaveStudentBed,
  onSaveVacationStay,
}) => {
  const { account, currentBusiness, currentBranch, currentUser, language } = useAtriumSelector(
    (s) => ({
      account: s.account,
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      currentUser: s.currentUser,
      language: s.language,
    }),
    shallowEqualObjects
  );

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const [modeTab, setModeTab] = useState<'syndic' | 'vefa' | 'student' | 'vacation'>('syndic');

  // Syndic state
  const [bldgName, setBldgName] = useState('');
  const [bldgTotalTantiemes, setBldgTotalTantiemes] = useState('1000');
  const [callBudgetDzd, setCallBudgetDzd] = useState('250000');
  const [assemblyType, setAssemblyType] = useState<'AGO' | 'AGE'>('AGO');
  const [presentTantiemes, setPresentTantiemes] = useState('520');
  const [representedTantiemes, setRepresentedTantiemes] = useState('80');

  // VEFA state
  const [progName, setProgName] = useState('');
  const [lotCode, setLotCode] = useState('LOT-A01');
  const [lotPriceDzd, setLotPriceDzd] = useState('18500000');
  const [milestonePctStr, setMilestonePctStr] = useState('20,25,25,20,10');

  // Student housing state
  const [resName, setResName] = useState('Résidence El Bahia');
  const [bedCode, setBedCode] = useState('CH-104-A');
  const [studentName, setStudentName] = useState('');
  const [monthlyRateDzd, setMonthlyRateDzd] = useState('22000');
  const [depositPaid, setDepositPaid] = useState(true);

  // Vacation rental state
  const [vacPropId, setVacPropId] = useState(() => properties[0]?.id || '');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().slice(0, 10));
  const [checkOutDate, setCheckOutDate] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  );
  const [nightlyRateDzd, setNightlyRateDzd] = useState('18000');

  const baseCtx = {
    accountId: currentBranch?.accountId || account.id || '',
    businessId: currentBusiness?.id || '',
    branchId: currentBranch?.id || '',
    staffId: currentUser?.id || '',
  };

  const handleCreateSyndicCall = (e: React.FormEvent) => {
    e.preventDefault();
    const nowIso = new Date().toISOString();
    const bldg =
      syndicBuildings[0] ||
      ({
        ...baseCtx,
        id: `synb_${Date.now()}`,
        buildingCode: `COP-${syndicBuildings.length + 1}`,
        name: bldgName.trim() || 'Résidence Les Jasmins',
        address: currentBranch?.address || 'Alger',
        wilaya: 'Alger',
        totalLots: 3,
        totalTantiemes: Math.max(100, Number(bldgTotalTantiemes) || 1000),
        reserveFundDzd: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      } satisfies SyndicBuilding);
    if (syndicBuildings.length === 0) onAddSyndicBuilding(bldg);

    const t1 = Math.round(bldg.totalTantiemes * 0.4);
    const t2 = Math.round(bldg.totalTantiemes * 0.35);
    const t3 = Math.max(1, bldg.totalTantiemes - t1 - t2);
    const alloc = allocateSyndicFundCallByTantiemes(Number(callBudgetDzd) || 0, [
      { lotNumber: 'Lot 01', ownerName: 'Copropriétaire A', tantiemes: t1 },
      { lotNumber: 'Lot 02', ownerName: 'Copropriétaire B', tantiemes: t2 },
      { lotNumber: 'Lot 03', ownerName: 'Copropriétaire C', tantiemes: t3 },
    ]);

    const call: SyndicFundCall = {
      ...baseCtx,
      id: `syncall_${Date.now()}`,
      buildingId: bldg.id,
      buildingName: bldg.name,
      callNumber: formatRealEstateSequentialCode('APP', syndicFundCalls.map((c) => c.callNumber)),
      quarterLabel: `${nowIso.slice(0, 4)}-T${Math.floor(new Date().getMonth() / 3) + 1}`,
      dueDate: nowIso.slice(0, 10),
      totalBudgetDzd: Number(callBudgetDzd) || 0,
      totalTantiemes: alloc.totalTantiemes,
      allocations: alloc.allocations,
      collectedDzd: 0,
      status: 'Issued',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    onIssueSyndicFundCall(call);
    showToast(L('Syndic fund call issued by tantièmes.', 'Appel de fonds Syndic émis par tantièmes.', 'تم إصدار استدعاء أموال السانديك.'), 'success');
  };

  const handleRecordAssembly = () => {
    const nowIso = new Date().toISOString();
    const total = syndicBuildings[0]?.totalTantiemes || Number(bldgTotalTantiemes) || 1000;
    const p = Number(presentTantiemes) || 0;
    const r = Number(representedTantiemes) || 0;
    const q = evaluateSyndicAssemblyQuorum(p, r, total, assemblyType);
    const bldg = syndicBuildings[0];
    onRecordSyndicAssembly({
      ...baseCtx,
      id: `synasm_${Date.now()}`,
      buildingId: bldg?.id || 'synb_default',
      buildingName: bldg?.name || bldgName.trim() || 'Résidence Les Jasmins',
      title: `${assemblyType} ${nowIso.slice(0, 4)}`,
      assemblyType,
      meetingDate: nowIso.slice(0, 10),
      presentTantiemes: p,
      representedTantiemes: r,
      totalTantiemes: total,
      quorumPercent: q.quorumPercent,
      quorumReached: q.quorumReached,
      status: q.quorumReached ? 'Held' : 'Adjourned',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    showToast(
      q.quorumReached
        ? L(`Quorum reached (${q.quorumPercent}%).`, `Quorum atteint (${q.quorumPercent}%).`, `اكتمل النصاب القانوني (${q.quorumPercent}%).`)
        : L(`Quorum not met (${q.quorumPercent}% < ${q.requiredPercent}%).`, `Quorum insuffisant (${q.quorumPercent}% < ${q.requiredPercent}%).`, `لم يكتمل النصاب (${q.quorumPercent}%).`),
      q.quorumReached ? 'success' : 'warning'
    );
  };

  const handleCreateVefaLot = (e: React.FormEvent) => {
    e.preventDefault();
    const pcts = milestonePctStr.split(',').map((s) => Number(s.trim()));
    const codes: DevVefaMilestone['code'][] = ['RESERVATION', 'FONDATIONS', 'GROS_OEUVRE', 'CLOS_COUVERT', 'LIVRAISON'];
    const labels = ['Réservation', 'Fondations', 'Gros Œuvre', 'Clos & Couvert', 'Livraison Clés'];
    const draftMilestones: DevVefaMilestone[] = pcts.map((pct, i) => ({
      code: codes[i] || `STEP_${i + 1}`,
      label: labels[i] || `Palier ${i + 1}`,
      percentBps: Math.round((pct || 0) * 100),
      amountDzd: 0,
      status: 'Pending',
    }));

    const validation = validateVefaMilestones(draftMilestones, Number(lotPriceDzd) || 0);
    if (!validation.valid) {
      showToast(
        L(
          `VEFA milestones must equal 100% (currently ${(validation.totalBps / 100).toFixed(2)}%).`,
          `Les paliers VEFA doivent totaliser 100% (actuellement ${(validation.totalBps / 100).toFixed(2)}%).`,
          `يجب أن تساوي مراحل VEFA 100% (الحالي ${(validation.totalBps / 100).toFixed(2)}%).`
        ),
        'error'
      );
      return;
    }

    const nowIso = new Date().toISOString();
    const prog: DevProgram =
      devPrograms[0] ||
      ({
        ...baseCtx,
        id: `prog_${Date.now()}`,
        programCode: formatRealEstateSequentialCode('PROG', devPrograms.map((p) => p.programCode)),
        name: progName.trim() || 'Résidence Horizon VEFA',
        wilaya: 'Alger',
        promoterName: currentBusiness?.name || 'Promotion Immobilière',
        deliveryQuarter: '2027-Q4',
        totalUnits: 24,
        status: 'Foundation',
        createdAt: nowIso,
        updatedAt: nowIso,
      } satisfies DevProgram);
    if (devPrograms.length === 0) onAddDevProgram(prog);

    onSaveDevLot({
      ...baseCtx,
      id: `lot_${Date.now()}`,
      programId: prog.id,
      programName: prog.name,
      lotCode: lotCode.trim() || `LOT-${devLots.length + 1}`,
      typology: 'F3',
      floorNumber: 2,
      surfaceM2: 96,
      priceDzd: Math.max(0, Number(lotPriceDzd) || 0),
      milestones: validation.normalizedMilestones,
      paidTotalDzd: 0,
      status: 'Available',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    showToast(L('VEFA lot saved with validated 100% milestones.', 'Lot VEFA enregistré (échéancier 100% validé).', 'تم حفظ وحدة VEFA بنسبة 100%.'), 'success');
  };

  const handleSaveBed = (e: React.FormEvent) => {
    e.preventDefault();
    const nowIso = new Date().toISOString();
    const rate = Math.max(0, Number(monthlyRateDzd) || 0);
    onSaveStudentBed({
      ...baseCtx,
      id: `bed_${Date.now()}`,
      residenceName: resName.trim() || 'Résidence Universitaire',
      roomCode: bedCode.slice(0, 6) || 'CH-101',
      bedCode: bedCode.trim() || `BED-${studentBeds.length + 1}`,
      semesterLabel: '2026-S2',
      monthlyRateDzd: rate,
      semesterDepositDzd: rate,
      depositPaid,
      studentName: studentName.trim() || undefined,
      status: studentName.trim() ? 'Occupied' : 'Vacant',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    setStudentName('');
    showToast(L('Student bed updated.', 'Lit étudiant enregistré.', 'تم حفظ السرير الجامعي.'), 'success');
  };

  const handleSaveVacation = (e: React.FormEvent) => {
    e.preventDefault();
    const prop = properties.find((p) => p.id === vacPropId) || properties[0];
    if (!prop || !guestName.trim()) {
      showToast(L('Select property and enter guest name.', 'Sélectionnez le bien et le nom du client.', 'اختر العقار واسم النزيل.'), 'warning');
      return;
    }
    const nowIso = new Date().toISOString();
    const rate = Math.max(0, Number(nightlyRateDzd) || 0);
    const nights = Math.max(1, Math.round((Date.parse(`${checkOutDate}T00:00:00Z`) - Date.parse(`${checkInDate}T00:00:00Z`)) / 86400000));
    const res = onSaveVacationStay({
      ...baseCtx,
      id: `stay_${Date.now()}`,
      stayCode: formatRealEstateSequentialCode('STAY', vacationStays.map((s) => s.stayCode)),
      propertyId: prop.id,
      propertyTitle: prop.title,
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim() || '0550000000',
      checkInDate,
      checkOutDate,
      nightsCount: nights,
      nightlyRateDzd: rate,
      cleaningFeeDzd: 4000,
      totalAmountDzd: nights * rate + 4000,
      depositDzd: 20000,
      cleaningStatus: 'CleanReady',
      status: 'Confirmed',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    if (!res.ok) {
      showToast(
        res.errorCode === 'RE_VACATION_STAY_OVERLAP'
          ? L('Dates overlap an existing confirmed stay on this unit.', 'Conflit de dates : séjour déjà réservé sur ce bien.', 'تداخل في التواريخ مع إقامة مؤكدة لنفس الوحدة.')
          : L('Check-out date must be after check-in date.', 'La date de départ doit suivre l’arrivée.', 'تاريخ المغادرة يجب أن يكون بعد الدخول.'),
        'error'
      );
      return;
    }
    setGuestName('');
    showToast(L('Seasonal booking confirmed.', 'Séjour saisonnier confirmé.', 'تم تأكيد الحجز الموسمي.'), 'success');
  };

  const tabs: Array<{ id: typeof modeTab; label: string; icon: React.ReactNode }> = [
    { id: 'syndic', label: L('Syndic Co-Ownership', 'Syndic Copropriété', 'اتحاد الملاك'), icon: <Building size={14} /> },
    { id: 'vefa', label: L('VEFA Developers', 'Promoteurs VEFA', 'الترقية العقارية VEFA'), icon: <HardHat size={14} /> },
    { id: 'student', label: L('Student Housing', 'Résidences Étudiantes', 'الإقامات الطلابية'), icon: <GraduationCap size={14} /> },
    { id: 'vacation', label: L('Vacation Rentals', 'Locations Saisonnières', 'الإيجار الموسمي'), icon: <Palmtree size={14} /> },
  ];

  return (
    <ScreenPod>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="t-pod font-semibold text-black dark:text-white flex items-center gap-2">
              <Users size={18} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
              <span>{L('Specialized Real Estate Trade Modes', 'Modes Métiers Spécialisés', 'أنماط النشاط العقاري المتخصصة')}</span>
            </h2>
            <p className="t-cap text-black/55 dark:text-white/60 mt-0.5">
              {L('Syndic tantièmes & AG quorum, VEFA 100% milestones, student beds, and overlap-safe vacation stays.', 'Tantièmes & AG Syndic, paliers VEFA 100%, lits étudiants et calendriers saisonniers anti-doublon.', 'السانديك، مراحل الترقية العقارية، الأسرة الطلابية والإيجار الموسمي.')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tb) => (
              <button
                key={tb.id}
                type="button"
                onClick={() => setModeTab(tb.id)}
                data-sq="ctl-sm"
                data-sq-border="solid"
                className={`px-3 py-1.5 t-small font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                  modeTab === tb.id
                    ? 'bg-[#BF431F] text-white [--sq-stroke:#BF431F]'
                    : 'bg-[#FAF7F4] dark:bg-[#22201E] text-black/75 dark:text-white/75 [--sq-stroke:var(--sq-stroke-card)]'
                }`}
              >
                {tb.icon}
                <span>{tb.label}</span>
              </button>
            ))}
          </div>
        </div>

        {modeTab === 'syndic' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <form onSubmit={handleCreateSyndicCall} data-sq="card" data-sq-border="solid" className="p-4 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] space-y-3 t-cap">
              <h3 className="t-label font-semibold text-black dark:text-white">{L('Issue Tantièmes Fund Call', 'Appel de Fonds par Tantièmes', 'إصدار استدعاء أموال')}</h3>
              <div className="grid grid-cols-3 gap-2">
                <LabelInput label={L('Building', 'Immeuble', 'العمارة')} value={bldgName} onChange={setBldgName} placeholder="Résidence Jasmins" />
                <LabelInput type="number" label={L('Total Tantièmes', 'Tantièmes', 'الأسهم')} value={bldgTotalTantiemes} onChange={setBldgTotalTantiemes} />
                <LabelInput type="number" label={L('Budget (DZD)', 'Budget (DA)', 'الميزانية (دج)')} value={callBudgetDzd} onChange={setCallBudgetDzd} />
              </div>
              <AtriumButton type="submit" variant="primary" size="sm" icon={<Plus size={14} />}>
                {L('Generate Exact Centimes Allocation', 'Émettre Appel de Fonds', 'توزيع الميزانية')}
              </AtriumButton>
              {syndicFundCalls.slice(0, 2).map((c) => (
                <div key={c.id} className="p-2.5 rounded bg-white dark:bg-[#191716] border border-[var(--atr-divider)] tabular-nums">
                  <div className="flex justify-between font-semibold">
                    <span>{c.callNumber} · {c.buildingName}</span>
                    <span>{formatMoney(c.totalBudgetDzd, language)}</span>
                  </div>
                  <div className="text-[11px] text-black/60 dark:text-white/60 mt-1">
                    {c.allocations.map((a) => `${a.lotNumber}: ${formatMoney(a.amountDzd, language)}`).join(' · ')}
                  </div>
                </div>
              ))}
            </form>

            <div data-sq="card" data-sq-border="solid" className="p-4 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] space-y-3 t-cap">
              <h3 className="t-label font-semibold text-black dark:text-white">{L('AGO / AGE Quorum Check', 'Quorum Assemblée Générale', 'نصاب الجمعية العامة')}</h3>
              <div className="grid grid-cols-3 gap-2">
                <LabelSelect
                  label={L('Type', 'Type AG', 'النوع')}
                  value={assemblyType}
                  onChange={(v) => setAssemblyType(v as 'AGO' | 'AGE')}
                  options={[
                    { value: 'AGO', label: 'AGO (50%)' },
                    { value: 'AGE', label: 'AGE (66.67%)' },
                  ]}
                />
                <LabelInput type="number" label={L('Present', 'Présents', 'حاضرون')} value={presentTantiemes} onChange={setPresentTantiemes} />
                <LabelInput type="number" label={L('Proxies', 'Pouvoirs', 'وكالات')} value={representedTantiemes} onChange={setRepresentedTantiemes} />
              </div>
              <AtriumButton type="button" variant="secondary" size="sm" onClick={handleRecordAssembly}>
                {L('Validate & Record Assembly', 'Calculer Quorum & Enregistrer', 'التحقق من النصاب')}
              </AtriumButton>
              {syndicAssemblies.slice(0, 2).map((a) => (
                <div key={a.id} className="p-2.5 rounded bg-white dark:bg-[#191716] border border-[var(--atr-divider)] flex justify-between items-center tabular-nums">
                  <span>{a.title} ({a.buildingName})</span>
                  <span className={a.quorumReached ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-amber-700 dark:text-amber-400 font-semibold'}>
                    {a.quorumPercent}% · {a.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {modeTab === 'vefa' && (
          <form onSubmit={handleCreateVefaLot} data-sq="card" data-sq-border="solid" className="p-4 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] space-y-3 t-cap">
            <h3 className="t-label font-semibold text-black dark:text-white">{L('VEFA Program Lot & 100% Milestone Guard', 'Lot VEFA & Échéancier 100% Loi 11-04', 'وحدة VEFA ومراحل الدفع')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <LabelInput label={L('Program', 'Programme', 'المشروع')} value={progName} onChange={setProgName} placeholder="Résidence Horizon" />
              <LabelInput label={L('Lot Code', 'Code Lot', 'رمز الوحدة')} value={lotCode} onChange={setLotCode} />
              <LabelInput type="number" label={L('Price (DZD)', 'Prix (DA)', 'السعر (دج)')} value={lotPriceDzd} onChange={setLotPriceDzd} />
              <LabelInput label={L('Milestones % (sum=100)', 'Paliers % (somme=100)', 'المراحل %')} value={milestonePctStr} onChange={setMilestonePctStr} />
            </div>
            <AtriumButton type="submit" variant="primary" size="sm" icon={<CheckCircle2 size={14} />}>
              {L('Validate & Save VEFA Lot', 'Valider & Créer Lot VEFA', 'التحقق وحفظ الوحدة')}
            </AtriumButton>
            {devLots.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                {devLots.slice(0, 4).map((lot) => (
                  <div key={lot.id} className="p-3 rounded bg-white dark:bg-[#191716] border border-[var(--atr-divider)] tabular-nums">
                    <div className="flex justify-between font-semibold">
                      <span>{lot.lotCode} · {lot.programName}</span>
                      <span>{formatMoney(lot.priceDzd, language)}</span>
                    </div>
                    <div className="text-[11px] text-black/60 dark:text-white/60 mt-1">
                      {lot.milestones.map((m) => `${m.label}: ${(m.percentBps / 100).toFixed(0)}%`).join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </form>
        )}

        {modeTab === 'student' && (
          <form onSubmit={handleSaveBed} data-sq="card" data-sq-border="solid" className="p-4 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] space-y-3 t-cap">
            <h3 className="t-label font-semibold text-black dark:text-white">{L('Student Housing Bed & Semester Deposit', 'Lit Résidence Étudiante & Caution Semestrielle', 'أسرة الإقامة الطلابية')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <LabelInput label={L('Residence', 'Résidence', 'الإقامة')} value={resName} onChange={setResName} />
              <LabelInput label={L('Bed Code', 'Code Lit', 'رمز السرير')} value={bedCode} onChange={setBedCode} />
              <LabelInput label={L('Student Name', 'Étudiant', 'اسم الطالب')} value={studentName} onChange={setStudentName} placeholder="Optionnel" />
              <LabelInput type="number" label={L('Monthly Rate (DZD)', 'Tarif/Mois (DA)', 'الأجرة الشهرية')} value={monthlyRateDzd} onChange={setMonthlyRateDzd} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2">
                <LiveSwitch checked={depositPaid} onCheckedChange={setDepositPaid} />
                <span>{L('Semester deposit collected', 'Caution semestrielle encaissée', 'تم تحصيل ضمان الفصل')}</span>
              </label>
              <AtriumButton type="submit" variant="primary" size="sm" icon={<Plus size={14} />}>
                {L('Save Bed Assignment', 'Enregistrer Lit', 'حفظ السرير')}
              </AtriumButton>
            </div>
            {studentBeds.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                {studentBeds.map((b) => (
                  <div key={b.id} className="p-2.5 rounded bg-white dark:bg-[#191716] border border-[var(--atr-divider)] tabular-nums">
                    <div className="font-semibold">{b.bedCode} · {b.status}</div>
                    <div className="text-black/60 dark:text-white/60">{b.studentName || L('Vacant', 'Libre', 'شاغر')} · {formatMoney(b.monthlyRateDzd, language)}</div>
                  </div>
                ))}
              </div>
            )}
          </form>
        )}

        {modeTab === 'vacation' && (
          <form onSubmit={handleSaveVacation} data-sq="card" data-sq-border="solid" className="p-4 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] space-y-3 t-cap">
            <h3 className="t-label font-semibold text-black dark:text-white">{L('Vacation Rental Booking (Overlap Guarded)', 'Réservation Saisonnière (Contrôle Chevauchement)', 'الحجز الموسمي (منع التداخل)')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <LabelSelect
                label={L('Unit *', 'Bien *', 'الوحدة *')}
                value={vacPropId}
                onChange={setVacPropId}
                options={properties.map((p) => ({ value: p.id, label: p.title }))}
              />
              <LabelInput label={L('Guest Name *', 'Nom Voyageur *', 'اسم النزيل *')} value={guestName} onChange={setGuestName} required />
              <LabelInput label={L('Phone', 'Téléphone', 'الهاتف')} value={guestPhone} onChange={setGuestPhone} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <LabelInput type="date" label={L('Check-In', 'Arrivée', 'تاريخ الدخول')} value={checkInDate} onChange={setCheckInDate} required />
              <LabelInput type="date" label={L('Check-Out', 'Départ', 'تاريخ المغادرة')} value={checkOutDate} onChange={setCheckOutDate} required />
              <LabelInput type="number" label={L('Nightly Rate (DZD)', 'Tarif Nuitée (DA)', 'سعر الليلة')} value={nightlyRateDzd} onChange={setNightlyRateDzd} />
            </div>
            <AtriumButton type="submit" variant="primary" size="sm" icon={<Plus size={14} />}>
              {L('Confirm Seasonal Stay', 'Confirmer Séjour', 'تأكيد الإقامة')}
            </AtriumButton>
            {vacationStays.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                {vacationStays.map((s) => (
                  <div key={s.id} className="p-2.5 rounded bg-white dark:bg-[#191716] border border-[var(--atr-divider)] tabular-nums flex justify-between">
                    <div>
                      <span className="font-semibold block">{s.stayCode} · {s.guestName}</span>
                      <span className="text-black/60 dark:text-white/60">{s.checkInDate} → {s.checkOutDate} ({s.nightsCount}n)</span>
                    </div>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">{formatMoney(s.totalAmountDzd, language)}</span>
                  </div>
                ))}
              </div>
            )}
          </form>
        )}
      </div>
    </ScreenPod>
  );
};

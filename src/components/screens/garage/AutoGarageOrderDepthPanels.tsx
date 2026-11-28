import React, { useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Play,
  Plus,
  ShieldAlert,
  Sparkles,
  Square,
  Trash2,
  Wrench,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentStaffFromState,
} from '../../../services/store';
import {
  DEFAULT_INSPECTION_CHECKLIST,
  evaluateBodyShopClaim,
  evaluateInspectionPv,
  type GarageEstimatePhoto,
  type InspectionChecklistItem,
} from '../../../utils/garageDepth';
import { formatMoney } from '../../../utils/rules';
import { useGarageData, type RepairOrder } from './garageData';
import { InspectorCard, InspectorKeyValue, InspectorListItem, InspectorSection } from '../../ui/kinetic';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';

export interface AutoGarageOrderDepthPanelsProps {
  order: RepairOrder;
  panelTab: 'devis' | 'labor' | 'specialties';
  language: string;
  isMechanicRole?: boolean;
}

export const AutoGarageOrderDepthPanels: React.FC<AutoGarageOrderDepthPanelsProps> = ({
  order,
  panelTab,
  language,
  isMechanicRole = false,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const L = (en: string, fr: string, ar: string) => (isAr ? ar : isEn ? en : fr);

  const { staff, currentUser } = useAtriumSelector(
    (s) => ({ staff: selectCurrentStaffFromState(s), currentUser: s.currentUser }),
    shallowEqualObjects
  );

  const garageStaff = useMemo(
    () => (staff || []).filter((s) => !s.status || s.status === 'active'),
    [staff]
  );

  const {
    flatRateCatalog,
    timeLogs,
    claims,
    inspectionPvs,
    detailingPackages,
    approveWorkOrderEstimate,
    attachEstimatePhoto,
    removeEstimatePhoto,
    addFlatRateLaborLine,
    startWorkOrderTimer,
    stopWorkOrderTimer,
    applyDetailingPackage,
    upsertInsuranceClaim,
    createInspectionPv,
  } = useGarageData();

  // Devis & Photos state
  const [approverName, setApproverName] = useState(order.clientName || '');
  const [photoCaption, setPhotoCaption] = useState('');

  // Barème & Chrono state
  const [selectedFlatRateId, setSelectedFlatRateId] = useState(flatRateCatalog[0]?.id || '');
  const [timerTechName, setTimerTechName] = useState(
    order.technicianName || garageStaff[0]?.fullName || currentUser?.fullName || 'Chef Atelier'
  );
  const [timerTaskLabel, setTimerTaskLabel] = useState('Diagnostic & Réparation');

  // Specialties state
  const [selectedDetailingId, setSelectedDetailingId] = useState(detailingPackages[0]?.id || '');
  const existingClaim = useMemo(
    () => claims.find((c) => c.workOrderId === order.id),
    [claims, order.id]
  );
  const [insurerName, setInsurerName] = useState(existingClaim?.insurerName || 'SAA Assurances');
  const [claimNumber, setClaimNumber] = useState(existingClaim?.claimNumber || '');
  const [claimedDzd, setClaimedDzd] = useState(
    existingClaim ? String(existingClaim.claimedDzd) : String(order.finalCostDzd || order.estimatedCostDzd || 45000)
  );
  const [approvedDzd, setApprovedDzd] = useState(
    existingClaim ? String(existingClaim.approvedDzd) : String(order.finalCostDzd || order.estimatedCostDzd || 40000)
  );
  const [deductibleDzd, setDeductibleDzd] = useState(existingClaim ? String(existingClaim.deductibleDzd) : '5000');

  const [pvChecklist, setPvChecklist] = useState<InspectionChecklistItem[]>(() =>
    DEFAULT_INSPECTION_CHECKLIST.map((item) => ({ ...item, result: 'ok' }))
  );

  const orderTimeLogs = useMemo(
    () => timeLogs.filter((l) => l.workOrderId === order.id),
    [timeLogs, order.id]
  );
  const runningLog = orderTimeLogs.find((l) => l.status === 'running');

  const handleStopBayTimer = () => {
    if (!runningLog) return;
    const res = stopWorkOrderTimer(runningLog.id);
    if (res) {
      showToast({
        type: 'success',
        title: L('Timer Stopped', 'Chrono Arrêté', 'تم إيقاف العداد'),
        message: `${res.completedLog.durationMinutes} min · Commission: ${formatMoney(res.commissionRecord.commissionAmountDzd, language)}`,
      });
    }
  };

  const handleStartBayTimer = () => {
    const techStaff = garageStaff.find((s) => s.fullName === timerTechName);
    startWorkOrderTimer({
      orderId: order.id,
      technicianStaffId: techStaff?.id,
      technicianName: timerTechName,
      taskLabel: timerTaskLabel,
    });
    showToast({
      type: 'info',
      title: L('Timer Started', 'Chrono Démarré', 'بدأ العداد'),
      message: `${timerTechName} · ${timerTaskLabel}`,
    });
  };

  const orderPvs = useMemo(
    () => inspectionPvs.filter((p) => p.workOrderId === order.id),
    [inspectionPvs, order.id]
  );

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      showToast({
        type: 'warning',
        title: L('File too large', 'Fichier trop volumineux', 'الملف كبير جداً'),
        message: L('Please select an image under 1.5 MB.', 'Veuillez choisir une image de moins de 1,5 Mo.', 'اختر صورة أقل من 1.5 ميغابايت.'),
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      const photo: GarageEstimatePhoto = {
        id: `eph_${Date.now()}`,
        name: file.name,
        caption: photoCaption.trim() || file.name,
        dataUrl,
        capturedAt: new Date().toISOString(),
      };
      attachEstimatePhoto(order.id, photo);
      setPhotoCaption('');
    };
    reader.readAsDataURL(file);
  };

  if (panelTab === 'devis') {
    const isApproved = order.estimateStatus === 'approved';
    return (
      <>
        <InspectorSection index={0} title={L('Customer Estimate Approval', 'Accord Devis Client', 'موافقة الزبون على العرض')}>
          <InspectorCard>
            <InspectorKeyValue
              label={L('Status', 'Statut Devis', 'الحالة')}
              value={isApproved ? L('Approved (Prices Locked)', 'Approuvé (Prix figés)', 'موافق عليه') : L('Pending Approval', 'En attente d’accord', 'في انتظار الموافقة')}
              tone={isApproved ? 'ok' : 'warn'}
              mono={false}
            />
            {order.estimateApprovedAt && (
              <InspectorKeyValue
                label={L('Approved By', 'Validé par', 'وافق عليه')}
                value={`${order.estimateApprovedBy || order.clientName} · ${new Date(order.estimateApprovedAt).toLocaleDateString()}`}
                mono={false}
              />
            )}
            <InspectorKeyValue
              label={L('Quoted Parts Snapshot', 'Tarifs Pièces Figés', 'الأسعار المثبتة')}
              value={`${Object.keys(order.quoteUnitPricesSnapshot || {}).length} ${L('SKUs locked', 'réf. figées', 'قطع مثبتة')}`}
              isLast
            />
          </InspectorCard>
          <div className="mt-3 space-y-2.5">
            <LabelInput
              field="estimateApprover"
              label={L('Approving Signatory', 'Nom du Signataire', 'اسم الموافق')}
              value={approverName}
              onChange={setApproverName}
              width="100%"
              height={38}
              corner={12}
            />
            <AtriumButton
              variant="primary"
              size="sm"
              className="w-full"
              icon={<CheckCircle2 size={15} />}
              disabled={isApproved}
              onClick={() => {
                approveWorkOrderEstimate(order.id, approverName);
                showToast({
                  type: 'success',
                  title: L('Estimate Approved', 'Devis Approuvé', 'تم اعتماد العرض'),
                  message: L(
                    'Part unit prices were snapshotted at approval.',
                    'Les prix des pièces ont été figés pour détecter toute dérive à la facturation.',
                    'تم تثبيت أسعار القطع للمقارنة عند الفوترة.'
                  ),
                });
              }}
            >
              {isApproved
                ? L('Estimate Already Approved', 'Devis Déjà Approuvé', 'العرض معتمد مسبقاً')
                : L('Approve Estimate & Lock Prices', 'Approuver le Devis Client', 'اعتماد عرض السعر')}
            </AtriumButton>
          </div>
        </InspectorSection>

        <InspectorSection index={1} title={L('Diagnostic & Damage Photos', 'Photos Diagnostic & Devis', 'صور التشخيص والأضرار')}>
          <div className="space-y-2.5">
            <LabelInput
              field="estimatePhotoCaption"
              label={L('Photo Caption', 'Légende Photo', 'وصف الصورة')}
              value={photoCaption}
              onChange={setPhotoCaption}
              placeholder={L('Ex: Brake pad wear front left', 'Ex: Disque AV fissuré', 'مثال: تآكل فرامل أمامية')}
              width="100%"
              height={38}
              corner={12}
            />
            <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#F5F1EC] dark:bg-[#2B2825] hover:bg-[#EAE1D8] dark:hover:bg-[#35312D] text-black dark:text-white t-small font-semibold cursor-pointer">
              <Camera size={15} />
              <span>{L('Attach Inspection Photo', 'Joindre Photo Diagnostic', 'إرفاق صورة تشخيص')}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
            <AtriumButton
              variant="secondary"
              size="sm"
              className="w-full"
              icon={<Plus size={14} />}
              onClick={() => {
                if (!photoCaption.trim()) return;
                attachEstimatePhoto(order.id, {
                  id: `eph_${Date.now()}`,
                  name: 'marker-note.svg',
                  caption: photoCaption.trim(),
                  dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="%23eee"/></svg>',
                  capturedAt: new Date().toISOString(),
                });
                setPhotoCaption('');
              }}
              disabled={!photoCaption.trim()}
            >
              {L('Save Note Marker Photo', 'Consigner Repère Visuel', 'تسجيل ملاحظة مصورة')}
            </AtriumButton>
          </div>
          {(order.estimatePhotos || []).length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {(order.estimatePhotos || []).map((photo) => (
                <div
                  key={photo.id}
                  data-sq="card"
                  data-sq-border="solid"
                  className="p-2 bg-[#FAF7F4] dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] space-y-1.5"
                >
                  <img src={photo.dataUrl} alt={photo.caption} className="w-full h-20 object-cover rounded-lg" />
                  <div className="flex items-center justify-between gap-1">
                    <span className="t-cap text-black dark:text-white truncate">{photo.caption}</span>
                    <button
                      type="button"
                      onClick={() => removeEstimatePhoto(order.id, photo.id)}
                      className="text-black/50 hover:text-rose-500 p-0.5 cursor-pointer"
                      aria-label="Remove photo"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </InspectorSection>
      </>
    );
  }

  if (panelTab === 'labor') {
    const selectedCatalog = flatRateCatalog.find((f) => f.id === selectedFlatRateId) || flatRateCatalog[0];
    return (
      <>
        <InspectorSection index={0} title={L('Flat-Rate Labor Catalog', 'Barème Temps & Main-d’œuvre', 'جدول الأوقات القياسية')}>
          <div className="space-y-2.5">
            <LabelSelect
              field="flatRateCatalogPick"
              label={L('Standard Operation', 'Forfait Barème Temps', 'الخدمة القياسية')}
              value={selectedFlatRateId}
              onChange={setSelectedFlatRateId}
              options={flatRateCatalog.map((item) => ({
                value: item.id,
                label: `${item.code} · ${item.label} (${item.standardHours}h · ${item.hourlyRateDzd.toLocaleString()} DA/h)`,
              }))}
              width="100%"
              height={40}
              corner={12}
            />
            <AtriumButton
              variant="primary"
              size="sm"
              className="w-full"
              icon={<Wrench size={14} />}
              disabled={!selectedCatalog || Boolean(order.isLockedInvoiced)}
              onClick={() => {
                if (!selectedCatalog) return;
                const techStaff = garageStaff.find((s) => s.fullName === timerTechName);
                addFlatRateLaborLine(order.id, selectedCatalog, techStaff?.id, timerTechName);
                showToast({
                  type: 'success',
                  title: L('Labor Line Added', 'Barème Ajouté', 'تمت إضافة العمل'),
                  message: `${selectedCatalog.label} (${selectedCatalog.standardHours}h)`,
                });
              }}
            >
              {L('Add Flat-Rate Labor Line', 'Ajouter au Devis Main-d’œuvre', 'إضافة لليد العاملة')}
            </AtriumButton>
          </div>
          {(order.laborLines || []).length > 0 && (
            <div className="mt-3">
              <InspectorCard>
                {(order.laborLines || []).map((line, i) => (
                  <InspectorListItem
                    key={line.id}
                    title={line.label}
                    subtitle={`${line.flatRateCode} · ${line.hours}h × ${line.hourlyRateDzd.toLocaleString()} DA`}
                    metaRight={!isMechanicRole ? formatMoney(line.totalDzd, language) : undefined}
                    isLast={i === (order.laborLines || []).length - 1}
                  />
                ))}
              </InspectorCard>
            </div>
          )}
        </InspectorSection>

        <InspectorSection index={1} title={L('Mechanic Time Clock', 'Chronomètre Mécanicien', 'عداد وقت الميكانيكي')}>
          <div className="space-y-2.5">
            <LabelSelect
              field="timerTechnician"
              label={L('Technician', 'Technicien', 'التقني')}
              value={timerTechName}
              onChange={setTimerTechName}
              options={
                garageStaff.length > 0
                  ? garageStaff.map((s) => ({ value: s.fullName, label: s.fullName }))
                  : [{ value: timerTechName, label: timerTechName }]
              }
              width="100%"
              height={38}
              corner={12}
            />
            <LabelInput
              field="timerTask"
              label={L('Task Label', 'Tâche Exécutée', 'المهمة')}
              value={timerTaskLabel}
              onChange={setTimerTaskLabel}
              width="100%"
              height={38}
              corner={12}
            />
            {runningLog ? (
              <AtriumButton
                variant="secondary"
                size="sm"
                className="w-full bg-rose-600 text-white hover:bg-rose-700"
                icon={<Square size={14} />}
                onClick={handleStopBayTimer}
              >
                {L(
                  `Stop Timer (${runningLog.technicianName})`,
                  `Arrêter Chrono (${runningLog.technicianName})`,
                  `إيقاف العداد (${runningLog.technicianName})`
                )}
              </AtriumButton>
            ) : (
              <AtriumButton
                variant="secondary"
                size="sm"
                className="w-full"
                icon={<Play size={14} />}
                onClick={handleStartBayTimer}
              >
                {L('Start Bay Time Clock', 'Démarrer Chrono Atelier', 'بدء توقيت العمل')}
              </AtriumButton>
            )}
          </div>
          {orderTimeLogs.length > 0 && (
            <div className="mt-3">
              <InspectorCard>
                {orderTimeLogs.map((log, i) => (
                  <InspectorListItem
                    key={log.id}
                    title={`${log.technicianName} · ${log.taskLabel}`}
                    subtitle={
                      log.status === 'running'
                        ? L('Running...', 'En cours...', 'قيد التشغيل...')
                        : `${log.durationMinutes} min · Commission ${formatMoney(log.commissionDzd || 0, language)}`
                    }
                    badge={{
                      label: log.status === 'running' ? L('Active', 'Actif', 'نشط') : L('Logged', 'Pointé', 'مسجل'),
                      tone: log.status === 'running' ? 'warn' : 'ok',
                    }}
                    isLast={i === orderTimeLogs.length - 1}
                  />
                ))}
              </InspectorCard>
            </div>
          )}
        </InspectorSection>
      </>
    );
  }

  // panelTab === 'specialties'
  const claimPreview = evaluateBodyShopClaim({
    claimedDzd: parseFloat(claimedDzd) || 0,
    approvedDzd: parseFloat(approvedDzd) || 0,
    deductibleDzd: parseFloat(deductibleDzd) || 0,
  });
  const pvPreview = evaluateInspectionPv(pvChecklist);

  return (
    <>
      <InspectorSection index={0} title={L('Detailing & Care Package', 'Forfait Detailing & Esthétique', 'باقة التنظيف والتلميع')}>
        <div className="space-y-2.5">
          <LabelSelect
            field="detailingPackagePick"
            label={L('Select Detailing Package', 'Pack Esthétique / Lavage', 'اختيار الباقة')}
            value={selectedDetailingId}
            onChange={setSelectedDetailingId}
            options={detailingPackages.map((pkg) => ({
              value: pkg.id,
              label: `${pkg.name} (${pkg.durationMinutes} min · ${pkg.priceDzd.toLocaleString()} DA)`,
            }))}
            width="100%"
            height={40}
            corner={12}
          />
          <AtriumButton
            variant="secondary"
            size="sm"
            className="w-full"
            icon={<Sparkles size={14} />}
            disabled={!detailingPackages.find((p) => p.id === selectedDetailingId) || Boolean(order.isLockedInvoiced)}
            onClick={() => {
              const pkg = detailingPackages.find((p) => p.id === selectedDetailingId);
              if (!pkg) return;
              applyDetailingPackage(order.id, pkg);
              showToast({
                type: 'success',
                title: L('Detailing Added', 'Forfait Ajouté', 'تمت إضافة الباقة'),
                message: pkg.name,
              });
            }}
          >
            {L('Apply Detailing Package', 'Appliquer Pack Detailing', 'تطبيق باقة التلميع')}
          </AtriumButton>
        </div>
      </InspectorSection>

      <InspectorSection index={1} title={L('Body Shop Insurance Claim', 'Dossier Sinistre Assurance Carrosserie', 'ملف تعويض التأمين')}>
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <LabelInput
              field="claimInsurer"
              label={L('Insurer', 'Compagnie', 'شركة التأمين')}
              value={insurerName}
              onChange={setInsurerName}
              width="100%"
              height={36}
              corner={12}
            />
            <LabelInput
              field="claimNum"
              label={L('Claim #', 'N° Sinistre', 'رقم الحادث')}
              value={claimNumber}
              onChange={setClaimNumber}
              placeholder="SIN-2026-041"
              width="100%"
              height={36}
              corner={12}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <LabelInput
              field="claimClaimed"
              label={L('Claimed', 'Réclamé', 'المطلوب')}
              type="number"
              value={claimedDzd}
              onChange={setClaimedDzd}
              width="100%"
              height={36}
              corner={12}
            />
            <LabelInput
              field="claimApproved"
              label={L('Expert', 'Accordé', 'الموافق')}
              type="number"
              value={approvedDzd}
              onChange={setApprovedDzd}
              width="100%"
              height={36}
              corner={12}
            />
            <LabelInput
              field="claimDeductible"
              label={L('Franchise', 'Franchise', 'التحمل')}
              type="number"
              value={deductibleDzd}
              onChange={setDeductibleDzd}
              width="100%"
              height={36}
              corner={12}
            />
          </div>
          <InspectorCard>
            <InspectorKeyValue label={L('Insurer Share', 'Prise en charge Assurance', 'حصة التأمين')} value={formatMoney(claimPreview.insurerShareDzd, language)} tone="ok" />
            <InspectorKeyValue label={L('Client Remainder', 'Reste à Charge Client', 'المتبقي على الزبون')} value={formatMoney(claimPreview.clientShareDzd, language)} tone="warn" isLast />
          </InspectorCard>
          <AtriumButton
            variant="secondary"
            size="sm"
            className="w-full"
            icon={<ShieldAlert size={14} />}
            onClick={() => {
              if (!claimNumber.trim()) {
                showToast({
                  type: 'warning',
                  title: L('Claim # Required', 'N° Sinistre requis', 'رقم الملف مطلوب'),
                  message: L('Enter the insurance claim reference.', 'Renseignez le numéro de dossier sinistre.', 'أدخل رقم ملف التأمين.'),
                });
                return;
              }
              upsertInsuranceClaim({
                id: existingClaim?.id || `clm_${Date.now()}`,
                branchId: order.branchId || 'branch_garage_main',
                workOrderId: order.id,
                orderNumber: order.orderNumber,
                insurerName: insurerName.trim() || 'SAA',
                claimNumber: claimNumber.trim(),
                claimedDzd: parseFloat(claimedDzd) || 0,
                approvedDzd: parseFloat(approvedDzd) || 0,
                deductibleDzd: parseFloat(deductibleDzd) || 0,
                insurerShareDzd: claimPreview.insurerShareDzd,
                clientShareDzd: claimPreview.clientShareDzd,
                status: 'agreed',
              });
              showToast({
                type: 'success',
                title: L('Insurance Claim Saved', 'Dossier Sinistre Enregistré', 'تم حفظ ملف التأمين'),
                message: `${claimNumber.trim()} · Assurance ${formatMoney(claimPreview.insurerShareDzd, language)}`,
              });
            }}
          >
            {L('Save Insurance Claim', 'Enregistrer Prise en Charge', 'حفظ ملف التأمين')}
          </AtriumButton>
        </div>
      </InspectorSection>

      <InspectorSection index={2} title={L('Inspection Center PV (7 Points)', 'Contrôle Technique — PV 7 Points', 'محضر الفحص التقني (7 نقاط)')}>
        <div className="space-y-2">
          {pvChecklist.map((item) => (
            <div
              key={item.code}
              data-sq="ctl-sm"
              data-sq-border="none"
              className="flex items-center justify-between gap-2 p-2.5 bg-[#F5F1EC] dark:bg-[#22201E] t-cap"
            >
              <span className="font-medium text-black dark:text-white truncate">{item.label}</span>
              <select
                value={item.result}
                onChange={(e) => {
                  const res = e.target.value as InspectionChecklistItem['result'];
                  setPvChecklist((prev) => prev.map((c) => (c.code === item.code ? { ...c, result: res } : c)));
                }}
                className="px-2 py-1 rounded-lg bg-white dark:bg-[#2B2825] text-black dark:text-white border border-[var(--atr-divider)] t-cap"
              >
                <option value="ok">Conforme</option>
                <option value="minor_defect">Défaut mineur</option>
                <option value="major_defect">Défaut majeur (CV)</option>
                <option value="critical_defect">Critique (Immobilisé)</option>
              </select>
            </div>
          ))}
          <InspectorCard>
            <InspectorKeyValue
              label={L('PV Verdict', 'Verdict PV', 'النتيجة')}
              value={`${pvPreview.verdict.toUpperCase()} (${pvPreview.defectsCount} ${L('defects', 'défauts', 'عيوب')})`}
              tone={pvPreview.verdict === 'favorable' ? 'ok' : 'warn'}
              mono={false}
              isLast
            />
          </InspectorCard>
          <AtriumButton
            variant="primary"
            size="sm"
            className="w-full"
            icon={<ClipboardCheck size={14} />}
            onClick={() => {
              const pvNumber = `PV-${new Date().getFullYear()}-${String(inspectionPvs.length + 1).padStart(4, '0')}`;
              createInspectionPv({
                id: `pv_${Date.now()}`,
                branchId: order.branchId || 'branch_garage_main',
                workOrderId: order.id,
                plateNumber: order.vehiclePlate,
                odometerKm: order.inOdometerKm || 0,
                pvNumber,
                inspectionDate: new Date().toISOString().slice(0, 10),
                inspectorName: order.technicianName || currentUser?.fullName || 'Contrôleur',
                verdict: pvPreview.verdict,
                defectsCount: pvPreview.defectsCount,
                majorDefectsCount: pvPreview.majorDefectsCount,
                validUntil: pvPreview.validUntil,
                checklist: pvChecklist,
              });
              showToast({
                type: 'success',
                title: L('Inspection PV Issued', 'PV Contrôle Émis', 'تم إصدار محضر الفحص'),
                message: `${pvNumber} · ${pvPreview.verdict}`,
              });
            }}
          >
            {L('Issue Inspection PV', 'Émettre PV Contrôle Technique', 'إصدار محضر الفحص')}
          </AtriumButton>
          {orderPvs.length > 0 && (
            <InspectorCard>
              {orderPvs.map((pv, i) => (
                <InspectorListItem
                  key={pv.id}
                  title={`${pv.pvNumber} · ${pv.verdict}`}
                  subtitle={`${pv.inspectionDate} · Valide: ${pv.validUntil}`}
                  badge={{ label: `${pv.defectsCount} déf.`, tone: pv.verdict === 'favorable' ? 'ok' : 'warn' }}
                  isLast={i === orderPvs.length - 1}
                />
              ))}
            </InspectorCard>
          )}
        </div>
      </InspectorSection>
    </>
  );
};

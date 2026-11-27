import React, { useState, useRef, useEffect } from 'react';
import { Gift, Package, FileCheck2, Eraser, Upload, Ban, Plus, CheckCircle2 } from 'lucide-react';
import {
  selectCurrentBranchFromState,
  selectCurrentMembersFromState,
  selectCurrentSalonConsentFormsFromState,
  selectCurrentSalonGiftCardsFromState,
  selectCurrentSalonPrepaidPackagesFromState,
  selectCurrentServicesFromState,
  shallowEqualObjects,
  showToast,
  useAtriumActions,
  useAtriumSelector,
} from '../../../services/store';
import { SalonConsentProtocolType } from '../../../types/index';
import { centimesToDzd } from '../../../utils/money';
import { formatMoney } from '../../../utils/rules';
import { storageService } from '../../../lib/supabase/services/storageService';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { Button } from '@/atrium/core';
import { EmptyState } from '../../../atrium/components/EmptyState';

interface SalonPackagesConsentPanelProps {
  mode: 'packages' | 'consent';
}

const CONSENT_CHECKLIST_QUESTIONS: Array<{ key: string; fr: string; en: string; ar: string }> = [
  {
    key: 'noContraindication',
    fr: 'Absence de grossesse, diabète décompensé ou infection cutanée active',
    en: 'No pregnancy, uncontrolled diabetes, or active skin infection',
    ar: 'عدم وجود حمل أو التهاب جلدي نشط',
  },
  {
    key: 'patchTestDone',
    fr: 'Test cutané / sensibilité vérifié avant le protocole',
    en: 'Patch test / skin sensitivity checked prior to treatment',
    ar: 'تم إجراء اختبار التحسس قبل الجلسة',
  },
  {
    key: 'aftercareUnderstood',
    fr: 'Consignes post-soin (protection UV, hydratation) expliquées et acceptées',
    en: 'Post-care instructions (UV protection, hydration) explained & accepted',
    ar: 'تم شرح والموافقة على تعليمات ما بعد الجلسة',
  },
];

export const SalonPackagesConsentPanel: React.FC<SalonPackagesConsentPanelProps> = React.memo(({ mode }) => {
  const {
    account,
    currentBranch,
    members,
    servicesCatalog,
    packages,
    giftCards,
    consentForms,
    language,
  } = useAtriumSelector(
    (s) => ({
      account: s.account,
      currentBranch: selectCurrentBranchFromState(s),
      members: selectCurrentMembersFromState(s),
      servicesCatalog: selectCurrentServicesFromState(s),
      packages: selectCurrentSalonPrepaidPackagesFromState(s),
      giftCards: selectCurrentSalonGiftCardsFromState(s),
      consentForms: selectCurrentSalonConsentFormsFromState(s),
      language: s.language,
    }),
    shallowEqualObjects
  );

  const {
    createSalonPrepaidPackage,
    createSalonGiftCard,
    voidSalonGiftCard,
    saveSalonConsentForm,
  } = useAtriumActions();

  const isAr = language === 'ar';
  const isEn = language === 'en';

  // Package state
  const [pkgClientId, setPkgClientId] = useState('');
  const [pkgName, setPkgName] = useState('');
  const [pkgSessions, setPkgSessions] = useState('5');
  const [pkgPriceDzd, setPkgPriceDzd] = useState('18000');
  const [pkgCategory, setPkgCategory] = useState('');
  const [pkgExpiresAt, setPkgExpiresAt] = useState('');

  // Gift card state
  const [gcRecipient, setGcRecipient] = useState('');
  const [gcPhone, setGcPhone] = useState('');
  const [gcAmountDzd, setGcAmountDzd] = useState('10000');
  const [gcCode, setGcCode] = useState('');

  // Consent state
  const [consClientId, setConsClientId] = useState('');
  const [consClientName, setConsClientName] = useState('');
  const [consServiceId, setConsServiceId] = useState('');
  const [consProtocol, setConsProtocol] = useState<SalonConsentProtocolType>('laser');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    noContraindication: true,
    patchTestDone: true,
    aftercareUnderstood: true,
  });
  const [allergiesAck, setAllergiesAck] = useState(true);
  const [typedSignature, setTypedSignature] = useState('');
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const [beforePhotoPath, setBeforePhotoPath] = useState<string | undefined>(undefined);
  const [afterPhotoPath, setAfterPhotoPath] = useState<string | undefined>(undefined);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!pkgClientId && members.length > 0) setPkgClientId(members[0].id);
    if (!consClientId && members.length > 0) {
      setConsClientId(members[0].id);
      setConsClientName(members[0].fullName);
    }
    if (!consServiceId && servicesCatalog.length > 0) {
      setConsServiceId(servicesCatalog[0].id);
    }
  }, [members, servicesCatalog, pkgClientId, consClientId, consServiceId]);

  const handleCreatePackage = (e: React.FormEvent) => {
    e.preventDefault();
    const client = members.find((m) => m.id === pkgClientId);
    if (!client || !pkgName.trim()) {
      showToast({
        type: 'warning',
        title: isEn ? 'Client & Package Name Required' : 'Client et nom du forfait requis',
        message: isEn ? 'Select a client and name the prepaid bundle.' : 'Sélectionnez une cliente et nommez le forfait.',
      });
      return;
    }
    const created = createSalonPrepaidPackage({
      clientId: client.id,
      clientName: client.fullName,
      packageName: pkgName.trim(),
      categoryFilter: pkgCategory.trim() || undefined,
      totalSessions: Math.max(1, parseInt(pkgSessions, 10) || 1),
      priceDzd: Math.max(0, parseFloat(pkgPriceDzd) || 0),
      expiresAt: pkgExpiresAt || undefined,
    });
    showToast({
      type: 'success',
      title: isEn ? 'Prepaid Package Issued' : 'Forfait prépayé créé',
      message: `${created.packageName} (${created.totalSessions} ${isEn ? 'sessions' : 'séances'})`,
    });
    setPkgName('');
  };

  const handleCreateGiftCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gcRecipient.trim()) {
      showToast({
        type: 'warning',
        title: isEn ? 'Recipient Required' : 'Bénéficiaire requis',
        message: isEn ? 'Enter the gift card recipient name.' : 'Saisissez le nom du bénéficiaire.',
      });
      return;
    }
    const gc = createSalonGiftCard({
      code: gcCode.trim() || undefined,
      recipientName: gcRecipient.trim(),
      recipientPhone: gcPhone.trim() || undefined,
      amountDzd: Math.max(500, parseFloat(gcAmountDzd) || 0),
    });
    showToast({
      type: 'success',
      title: isEn ? 'Gift Card Issued' : 'Carte Cadeau émise',
      message: `${gc.code} · ${formatMoney(centimesToDzd(gc.initialCentimes))}`,
    });
    setGcRecipient('');
    setGcPhone('');
    setGcCode('');
  };

  const handleStartDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = '#17130F';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
    setHasDrawnSignature(true);
  };

  const handleMoveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasDrawnSignature(false);
    setTypedSignature('');
  };

  const handlePhotoUpload = async (which: 'before' | 'after', file: File | null) => {
    if (!file) return;
    const res = await storageService.uploadScopedFile({
      bucket: 'expense-receipts',
      file,
      accountId: currentBranch?.accountId || account?.id,
      businessId: currentBranch?.businessId,
      branchId: currentBranch?.id,
      prefix: `salon_${which}`,
    });
    if (!res.success) {
      showToast({
        type: 'error',
        title: isEn ? 'Upload Rejected' : 'Téléversement refusé',
        message: res.error || 'Invalid file',
      });
      return;
    }
    if (which === 'before') setBeforePhotoPath(res.storagePath);
    else setAfterPhotoPath(res.storagePath);
    showToast({
      type: 'success',
      title: isEn ? 'Photo Attached' : 'Photo attachée',
      message: file.name,
    });
  };

  const handleSaveConsent = (e: React.FormEvent) => {
    e.preventDefault();
    const client = members.find((m) => m.id === consClientId);
    const resolvedClientName = client?.fullName || consClientName.trim();
    const service = servicesCatalog.find((s) => s.id === consServiceId);
    if (!resolvedClientName) {
      showToast({
        type: 'warning',
        title: isEn ? 'Client Required' : 'Cliente requise',
        message: isEn ? 'Select or enter the client name.' : 'Sélectionnez ou saisissez le nom de la cliente.',
      });
      return;
    }

    let sigUrl = '';
    if (hasDrawnSignature && canvasRef.current) {
      sigUrl = canvasRef.current.toDataURL('image/png');
    } else if (typedSignature.trim()) {
      sigUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(`SIGNED:${typedSignature.trim()}`)}`;
    }

    if (!sigUrl || !allergiesAck) {
      showToast({
        type: 'warning',
        title: isEn ? 'Signature & Allergy Ack Required' : 'Signature & consentement requis',
        message: isEn
          ? 'Please draw or type the client signature and confirm allergy acknowledgement.'
          : 'Signez sur le pad (ou tapez le nom) et cochez la confirmation allergies.',
      });
      return;
    }

    const saved = saveSalonConsentForm({
      clientId: client?.id || consClientId || 'walkin',
      clientName: resolvedClientName,
      serviceId: service?.id,
      serviceName: service?.name || consProtocol.toUpperCase(),
      protocolType: consProtocol,
      medicalChecklist: checklist,
      allergiesAcknowledged: allergiesAck,
      signatureDataUrl: sigUrl,
      beforePhotoPath,
      afterPhotoPath,
    });
    showToast({
      type: 'success',
      title: isAr ? 'تم حفظ نموذج الموافقة' : isEn ? 'Consent Form Signed' : 'Consentement enregistré',
      message: `${saved.clientName} · ${saved.serviceName}`,
    });
    handleClearCanvas();
    setBeforePhotoPath(undefined);
    setAfterPhotoPath(undefined);
  };

  if (mode === 'packages') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div data-sq="card" className="p-4 bg-white dark:bg-[#22201E] space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--atr-divider)]">
            <Package size={16} className="text-[var(--brand-text,#BF431F)]" />
            <h3 className="t-label font-semibold text-black dark:text-white">
              {isAr ? 'الباقات المدفوعة مسبقاً' : isEn ? 'Prepaid Treatment Packages' : 'Forfaits & Cures Prépayées'}
            </h3>
          </div>

          <form onSubmit={handleCreatePackage} className="space-y-3">
            <LabelSelect
              field="PackageClient"
              label={isAr ? 'الزبونة' : isEn ? 'Client' : 'Cliente'}
              value={pkgClientId}
              onChange={setPkgClientId}
              searchable
              options={members.map((m) => ({
                value: m.id,
                label: m.fullName,
                sublabel: m.phoneNumber,
              }))}
              width="100%"
              height={40}
              corner={12}
            />
            <LabelInput
              field="PackageName"
              label={isAr ? 'اسم الباقة' : isEn ? 'Package Name' : 'Intitulé du forfait'}
              value={pkgName}
              onChange={setPkgName}
              placeholder={isEn ? 'e.g. 5 Keratin Blowouts' : 'Ex: Cure 5 Brushings Kératine'}
              required
              width="100%"
              height={40}
              corner={12}
            />
            <div className="grid grid-cols-3 gap-2">
              <LabelInput
                field="PackageSessions"
                label={isAr ? 'الحصص' : isEn ? 'Sessions' : 'Séances'}
                type="number"
                min={1}
                value={pkgSessions}
                onChange={setPkgSessions}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelInput
                field="PackagePrice"
                label={isAr ? 'السعر (دج)' : isEn ? 'Price (DZD)' : 'Tarif (DZD)'}
                type="number"
                min={0}
                value={pkgPriceDzd}
                onChange={setPkgPriceDzd}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelInput
                field="PackageCategory"
                label={isAr ? 'الفئة' : isEn ? 'Category' : 'Catégorie'}
                value={pkgCategory}
                onChange={setPkgCategory}
                placeholder="Hair / Laser"
                width="100%"
                height={40}
                corner={12}
              />
            </div>
            <div className="flex items-end justify-between gap-2">
              <LabelInput
                field="PackageExpiry"
                label={isAr ? 'تاريخ الانتهاء' : isEn ? 'Expires On' : 'Expiration'}
                type="date"
                value={pkgExpiresAt}
                onChange={setPkgExpiresAt}
                width="100%"
                height={38}
                corner={10}
              />
              <Button type="submit" tone="accent" leading={<Plus size={14} />}>
                {isAr ? 'إصدار الباقة' : isEn ? 'Issue Package' : 'Créer Forfait'}
              </Button>
            </div>
          </form>

          <div className="space-y-2 pt-2 border-t border-[var(--atr-divider)]">
            {packages.length === 0 ? (
              <EmptyState
                variant="compact"
                icon={<Package />}
                title={isEn ? 'No prepaid packages issued' : 'Aucun forfait actif'}
                description={isEn ? 'Create a multi-session bundle above.' : 'Créez un forfait multi-séances ci-dessus.'}
              />
            ) : (
              packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-3 rounded-xl bg-[#FBF8F5] dark:bg-[#1A1816] flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="t-small font-semibold text-black dark:text-white">{pkg.packageName}</p>
                    <p className="t-cap text-black/65 dark:text-white/65">
                      {pkg.clientName} · {pkg.remainingSessions}/{pkg.totalSessions}{' '}
                      {isEn ? 'sessions left' : 'séances restantes'}
                    </p>
                  </div>
                  <div className="text-right tabular-nums">
                    <span className="t-small font-semibold text-[var(--brand-text,#BF431F)] block">
                      {formatMoney(centimesToDzd(pkg.priceCentimes))}
                    </span>
                    <span className="t-cap uppercase font-semibold text-emerald-700 dark:text-emerald-400">
                      {pkg.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div data-sq="card" className="p-4 bg-white dark:bg-[#22201E] space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--atr-divider)]">
            <Gift size={16} className="text-[var(--brand-text,#BF431F)]" />
            <h3 className="t-label font-semibold text-black dark:text-white">
              {isAr ? 'بطاقات الهدايا والقسائم' : isEn ? 'Gift Cards & Vouchers' : 'Cartes Cadeaux Salon'}
            </h3>
          </div>

          <form onSubmit={handleCreateGiftCard} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <LabelInput
                field="GiftCardRecipient"
                label={isAr ? 'اسم المستفيد *' : isEn ? 'Recipient Name *' : 'Bénéficiaire *'}
                value={gcRecipient}
                onChange={setGcRecipient}
                required
                width="100%"
                height={40}
                corner={12}
              />
              <LabelInput
                field="GiftCardPhone"
                label={isAr ? 'الهاتف' : isEn ? 'Phone' : 'Téléphone'}
                value={gcPhone}
                onChange={setGcPhone}
                width="100%"
                height={40}
                corner={12}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <LabelInput
                field="GiftCardAmount"
                label={isAr ? 'الرصيد (دج)' : isEn ? 'Amount (DZD)' : 'Montant (DZD)'}
                type="number"
                min={500}
                value={gcAmountDzd}
                onChange={setGcAmountDzd}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelInput
                field="GiftCardCode"
                label={isAr ? 'الرمز (تلقائي إذا فارغ)' : isEn ? 'Code (Auto if blank)' : 'Code (auto si vide)'}
                value={gcCode}
                onChange={setGcCode}
                placeholder="GC-VIP-2026"
                width="100%"
                height={40}
                corner={12}
              />
              <Button type="submit" tone="accent" leading={<Plus size={14} />}>
                {isAr ? 'إصدار' : isEn ? 'Issue Card' : 'Émettre'}
              </Button>
            </div>
          </form>

          <div className="space-y-2 pt-2 border-t border-[var(--atr-divider)]">
            {giftCards.length === 0 ? (
              <EmptyState
                variant="compact"
                icon={<Gift />}
                title={isEn ? 'No gift cards issued' : 'Aucune carte cadeau émise'}
                description={isEn ? 'Issue a gift card balance above.' : 'Émettez une carte cadeau ci-dessus.'}
              />
            ) : (
              giftCards.map((gc) => (
                <div
                  key={gc.id}
                  className="p-3 rounded-xl bg-[#FBF8F5] dark:bg-[#1A1816] flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="t-small font-semibold tabular-nums text-black dark:text-white">
                      {gc.code} · {gc.recipientName}
                    </p>
                    <p className="t-cap tabular-nums text-black/65 dark:text-white/65">
                      {isEn ? 'Balance:' : 'Solde :'} {formatMoney(centimesToDzd(gc.remainingCentimes))} /{' '}
                      {formatMoney(centimesToDzd(gc.initialCentimes))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="t-cap uppercase font-semibold text-emerald-700 dark:text-emerald-400">
                      {gc.status}
                    </span>
                    {gc.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => voidSalonGiftCard(gc.id)}
                        aria-label={`Void ${gc.code}`}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      >
                        <Ban size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-5">
      <form
        onSubmit={handleSaveConsent}
        data-sq="card"
        className="p-4 bg-white dark:bg-[#22201E] space-y-3"
      >
        <div className="flex items-center gap-2 pb-2 border-b border-[var(--atr-divider)]">
          <FileCheck2 size={16} className="text-[var(--brand-text,#BF431F)]" />
          <h3 className="t-label font-semibold text-black dark:text-white">
            {isAr ? 'موافقة التجميل بالليزر والوشم' : isEn ? 'Tattoo, Laser & Chemical Consent' : 'Consentement Tatouage, Laser & Protocole'}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {members.length > 0 ? (
            <LabelSelect
              field="ConsentClient"
              label={isAr ? 'الزبونة' : isEn ? 'Client' : 'Cliente'}
              value={consClientId}
              onChange={(val) => {
                setConsClientId(val);
                const m = members.find((item) => item.id === val);
                if (m) setConsClientName(m.fullName);
              }}
              searchable
              options={members.map((m) => ({ value: m.id, label: m.fullName, sublabel: m.phoneNumber }))}
              width="100%"
              height={40}
              corner={12}
            />
          ) : (
            <LabelInput
              field="ConsentClientManual"
              label={isAr ? 'اسم الزبونة *' : isEn ? 'Client Name *' : 'Nom cliente *'}
              value={consClientName}
              onChange={setConsClientName}
              required
              width="100%"
              height={40}
              corner={12}
            />
          )}
          <LabelSelect
            field="ConsentProtocol"
            label={isAr ? 'نوع البروتوكول' : isEn ? 'Protocol Type' : 'Protocole'}
            value={consProtocol}
            onChange={(val) => setConsProtocol(val as SalonConsentProtocolType)}
            options={[
              { value: 'laser', label: 'Laser / Épilation' },
              { value: 'tattoo', label: 'Tatouage / Dermopigmentation' },
              { value: 'microblading', label: 'Microblading' },
              { value: 'chemical_peel', label: 'Peeling Chimique' },
              { value: 'keratin', label: 'Lissage Kératine / Tanin' },
              { value: 'general', label: 'Soin Spécifique' },
            ]}
            width="100%"
            height={40}
            corner={12}
          />
        </div>

        {servicesCatalog.length > 0 && (
          <LabelSelect
            field="ConsentService"
            label={isAr ? 'الخدمة المرتبطة' : isEn ? 'Service' : 'Prestation associée'}
            value={consServiceId}
            onChange={setConsServiceId}
            options={servicesCatalog.map((s) => ({ value: s.id, label: s.name }))}
            width="100%"
            height={40}
            corner={12}
          />
        )}

        <div className="p-3 rounded-xl bg-[#FBF8F5] dark:bg-[#1A1816] space-y-2">
          <p className="t-cap font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">
            {isAr ? 'الفحص الطبي والاحتياطات' : isEn ? 'Medical Screening Checklist' : 'Questionnaire médical'}
          </p>
          {CONSENT_CHECKLIST_QUESTIONS.map((q) => (
            <label key={q.key} className="flex items-start gap-2 t-small text-black dark:text-white cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(checklist[q.key])}
                onChange={(e) => setChecklist((prev) => ({ ...prev, [q.key]: e.target.checked }))}
                className="mt-1 rounded accent-[#d4522f]"
              />
              <span>{isAr ? q.ar : isEn ? q.en : q.fr}</span>
            </label>
          ))}
          <label className="flex items-start gap-2 t-small font-semibold text-amber-800 dark:text-amber-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={allergiesAck}
              onChange={(e) => setAllergiesAck(e.target.checked)}
              className="mt-1 rounded accent-[#d4522f]"
            />
            <span>
              {isAr
                ? 'أؤكد الإفصاح عن جميع الحساسيات وموانع الاستعمال'
                : isEn
                ? 'Client confirmed all allergies & contraindications disclosed'
                : 'La cliente certifie avoir déclaré ses allergies et contre-indications'}
            </span>
          </label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="t-small font-medium text-black dark:text-white">
              {isAr ? 'التوقيع الإلكتروني' : isEn ? 'Client Signature Pad' : 'Signature électronique'}
            </label>
            <button
              type="button"
              onClick={handleClearCanvas}
              className="inline-flex items-center gap-1 t-cap text-black/65 dark:text-white/65 hover:text-black cursor-pointer"
            >
              <Eraser size={12} /> {isEn ? 'Clear' : 'Effacer'}
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={380}
            height={110}
            data-testid="consent-signature-canvas"
            onPointerDown={handleStartDraw}
            onPointerMove={handleMoveDraw}
            onPointerUp={() => setIsDrawing(false)}
            onPointerLeave={() => setIsDrawing(false)}
            className="w-full h-[110px] rounded-xl border border-dashed border-black/20 dark:border-white/20 bg-white touch-none cursor-crosshair"
          />
          <LabelInput
            field="TypedSignature"
            label={isAr ? 'أو كتابة الاسم للتوقيع' : isEn ? 'Or Typed Legal Name' : 'Ou signature dactylographiée'}
            value={typedSignature}
            onChange={setTypedSignature}
            placeholder={consClientName || 'Full Name'}
            width="100%"
            height={36}
            corner={10}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#F5F1EC] dark:bg-[#2B2825] t-cap font-medium cursor-pointer hover:bg-[#EAE3DB]">
            <Upload size={13} />
            <span>{beforePhotoPath ? 'Avant ✓' : isEn ? 'Before Photo' : 'Photo Avant'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handlePhotoUpload('before', e.target.files?.[0] || null)}
            />
          </label>
          <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#F5F1EC] dark:bg-[#2B2825] t-cap font-medium cursor-pointer hover:bg-[#EAE3DB]">
            <Upload size={13} />
            <span>{afterPhotoPath ? 'Après ✓' : isEn ? 'After Photo' : 'Photo Après'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handlePhotoUpload('after', e.target.files?.[0] || null)}
            />
          </label>
        </div>

        <Button type="submit" tone="accent" leading={<CheckCircle2 size={14} />}>
          {isAr ? 'حفظ التوقيع والموافقة' : isEn ? 'Sign & Archive Consent' : 'Valider le consentement'}
        </Button>
      </form>

      <div data-sq="card" className="p-4 bg-white dark:bg-[#22201E] space-y-3">
        <h3 className="t-label font-semibold text-black dark:text-white pb-2 border-b border-[var(--atr-divider)]">
          {isAr ? 'سجل الموافقات الموقعة' : isEn ? `Signed Consent Archive (${consentForms.length})` : `Archives Consentements (${consentForms.length})`}
        </h3>
        {consentForms.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={<FileCheck2 />}
            title={isEn ? 'No signed consent forms yet' : 'Aucun consentement archivé'}
            description={isEn ? 'Signed laser, tattoo, or chemical peel forms appear here.' : 'Les décharges signées apparaîtront ici.'}
          />
        ) : (
          <div className="space-y-2.5">
            {consentForms.map((form) => (
              <div
                key={form.id}
                className="p-3 rounded-xl bg-[#FBF8F5] dark:bg-[#1A1816] flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <p className="t-small font-semibold text-black dark:text-white">
                    {form.clientName} · {form.serviceName}
                  </p>
                  <p className="t-cap text-black/65 dark:text-white/65">
                    {form.protocolType.toUpperCase()} · {form.signedAt.slice(0, 10)}
                    {form.beforePhotoPath ? ' · Avant' : ''}
                    {form.afterPhotoPath ? ' · Après' : ''}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full t-cap font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  {isEn ? 'Signed & Verified' : 'Signé'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

SalonPackagesConsentPanel.displayName = 'SalonPackagesConsentPanel';

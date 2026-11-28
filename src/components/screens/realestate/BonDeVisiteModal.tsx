import React, { useState, useRef, useEffect } from 'react';
import { X, MapPin, CheckCircle, RotateCcw, Shield } from 'lucide-react';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { RealEstateProperty, BonDeVisiteRecord, VisitGpsStatus } from '../../../types';
import { KineticModalShell } from '../../ui/kinetic';
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBusinessFromState,
  selectCurrentBranchFromState,
  showToast,
} from '../../../services/store';
import { t } from '../../../utils/i18n';
import { formatVisitGpsLabel, normalizeVisitGpsState } from '../../../utils/realEstateDepth';

interface BonDeVisiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (visit: BonDeVisiteRecord) => void;
  properties: RealEstateProperty[];
  selectedProperty?: RealEstateProperty | null;
}

export const BonDeVisiteModal: React.FC<BonDeVisiteModalProps> = ({ isOpen, onClose, onSave, properties, selectedProperty }) => {
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
  const activeProp = selectedProperty || properties[0];

  const [clientFullName, setClientFullName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNationalId, setClientNationalId] = useState('');
  const [negotiatorName, setNegotiatorName] = useState(currentUser?.fullName || '');
  const [clientImpression, setClientImpression] = useState<'Interested' | 'NeedsNegotiation' | 'OfferSubmitted' | 'PriceTooHigh' | 'Unfavorable'>('Interested');
  const [counterOfferDzd, setCounterOfferDzd] = useState(activeProp ? Math.round(activeProp.priceDzd * 0.95) : 0);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [gpsStatus, setGpsStatus] = useState<VisitGpsStatus>('unavailable');
  const [gpsLatitude, setGpsLatitude] = useState<number | undefined>(undefined);
  const [gpsLongitude, setGpsLongitude] = useState<number | undefined>(undefined);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | undefined>(undefined);
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const handleCaptureGps = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      const state = normalizeVisitGpsState({});
      setGpsStatus(state.gpsStatus);
      setGpsLatitude(undefined);
      setGpsLongitude(undefined);
      setGpsAccuracy(undefined);
      return;
    }

    setIsGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = normalizeVisitGpsState({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
        });
        setGpsStatus(next.gpsStatus);
        setGpsLatitude(next.gpsLatitude);
        setGpsLongitude(next.gpsLongitude);
        setGpsAccuracy(next.gpsAccuracyMeters);
        setIsGpsLoading(false);
      },
      (err) => {
        const next = normalizeVisitGpsState({ errorCode: err?.code ?? 2 });
        setGpsStatus(next.gpsStatus);
        setGpsLatitude(undefined);
        setGpsLongitude(undefined);
        setGpsAccuracy(undefined);
        setIsGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  useEffect(() => {
    if (isOpen) {
      setCounterOfferDzd(activeProp ? Math.round(activeProp.priceDzd * 0.95) : 0);
      setNegotiatorName(currentUser?.fullName || '');
      handleCaptureGps();
    }
  }, [isOpen, activeProp?.id, currentUser?.fullName]);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as React.MouseEvent<HTMLCanvasElement>).clientX;
    const clientY = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientY : (e as React.MouseEvent<HTMLCanvasElement>).clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    setHasSignature(true);
    const { x, y } = getCanvasPoint(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? '#FAFAFA' : '#18181B';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e) e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const activeAccountId = (activeProp?.accountId || currentBranch?.accountId || account?.id || '').trim();
    const activeBranchId = (activeProp?.branchId || currentBranch?.id || '').trim();
    if (!activeAccountId || !activeBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', language),
        message: t('tenant_context_missing_msg', language),
      });
      return;
    }

    if (!canvasRef.current || !hasSignature) {
      showToast({
        type: 'error',
        title: isAr ? 'التوقيع مطلوب' : isEn ? 'Signature Required' : 'Signature Acquereur Requise',
        message: isAr ? 'يرجى التوقيع على اللوحة قبل اعتماد وصل الزيارة.' : isEn ? 'Please sign on the touch pad before certifying the visit slip.' : 'Veuillez recueillir la signature manuscrite sur la zone dédiée avant validation.',
      });
      return;
    }

    const signatureSvgData = canvasRef.current.toDataURL('image/png');
    const nowIso = new Date().toISOString();
    onSave({
      id: `vis_${Date.now()}`,
      accountId: activeAccountId,
      businessId: activeProp?.businessId || currentBusiness?.id || '',
      branchId: activeBranchId,
      staffId: activeProp?.staffId || currentUser?.id || '',
      negotiatorName,
      propertyId: activeProp?.id || '',
      propertyTitle: activeProp?.title || 'Bien Immobilier',
      propertyAddress: activeProp?.address || '',
      clientFullName: clientFullName.trim(),
      clientPhone: clientPhone.trim(),
      clientNationalId: clientNationalId.trim(),
      visitTimestamp: nowIso,
      gpsStatus,
      gpsLatitude,
      gpsLongitude,
      gpsAccuracyMeters: gpsAccuracy,
      signatureSvgData,
      signedOffline: false,
      clientImpression,
      counterOfferDzd: Number(counterOfferDzd) || undefined,
      clientFeedbackNotes: feedbackNotes.trim(),
      whatsappConfirmationSent: true,
      createdAt: nowIso,
    });
    clearSignature();
    onClose();
  };

  const gpsText = formatVisitGpsLabel({ gpsStatus, gpsLatitude, gpsLongitude }, language);

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      scrimClassName="bg-black/60"
      ariaLabel="Bon de Visite Numérique Certifié"
    >
      <div data-sq="panel" data-sq-border="solid" className="relative w-full max-h-[92vh] overflow-y-auto bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 md:p-8 text-black dark:text-white">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--atr-divider)] mb-5">
          <div className="flex items-center gap-3">
            <div data-sq="tile" data-sq-border="none" className="w-10 h-10 bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold"><Shield className="w-5 h-5" /></div>
            <div>
              <h2 className="t-dialog font-semibold">{isAr ? 'وصل زيارة رقمي موثق' : isEn ? 'Certified Digital Viewing Slip' : 'Bon de Visite Numérique Certifié'}</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" data-sq="ctl-sm" data-sq-border="none" className="p-2 text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div data-sq="card" data-sq-border="none" className="p-4 bg-[#F3EDE7] dark:bg-[#22201E] mb-5 flex items-center justify-between">
          <div>
            <div className="t-small text-black/70 dark:text-white/75 font-semibold">{isAr ? 'العقار المزار' : isEn ? 'Visited Property' : 'Bien Visité'}</div>
            <div className="t-label font-semibold text-black dark:text-white truncate max-w-md">{activeProp?.title}</div>
            <div className="t-cap text-black/70 dark:text-white/75">
              {activeProp?.address} ({activeProp?.cityWilaya})
            </div>
          </div>
          <div className="text-right">
            <div className="t-cap text-black/70 dark:text-white/75">{isAr ? 'السعر المعلن' : isEn ? 'Asking Price' : 'Prix Annoncé'}</div>
            <div className="t-label font-semibold tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
              {(activeProp?.priceDzd || 0).toLocaleString()} DZD
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <LabelInput label={isAr ? 'اسم ولقب المشتري' : isEn ? 'Buyer Full Name' : "Nom & Prénom de l'Acquéreur"} value={clientFullName} onChange={setClientFullName} placeholder="Ex: Sofiane Medjahed" required />
            <LabelInput label={isAr ? 'رقم الهاتف' : isEn ? 'Mobile Phone' : 'Téléphone Portable'} value={clientPhone} onChange={setClientPhone} placeholder="Ex: 0550 49 11 22" required />
            <LabelInput label={isAr ? 'رقم بطاقة التعريف الوطنية' : isEn ? 'National ID (CNI)' : 'N° CNI (18 Chiffres)'} value={clientNationalId} onChange={setClientNationalId} placeholder="Ex: 109823487192837461" required />
          </div>
          <div data-sq="card" data-sq-border="none" className="p-3 bg-[#FDF4F0] dark:bg-[#2B2825] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
              <div className="t-cap">
                <span className="font-semibold text-black dark:text-white">{isAr ? 'تحديد الموقع GPS:' : isEn ? 'Visit Geolocation:' : "Géolocalisation d'Intervention:"}</span>{' '}
                {isGpsLoading ? (
                  <span className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] animate-pulse">
                    {isAr ? 'جاري التقاط إشارة GPS...' : isEn ? 'Acquiring GPS signal...' : 'Recherche signal satellite GPS...'}
                  </span>
                ) : gpsStatus === 'captured' ? (
                  <span className="tabular-nums text-emerald-700 dark:text-emerald-400 font-medium">
                    {gpsText}{typeof gpsAccuracy === 'number' ? ` (±${gpsAccuracy}m)` : ''}
                  </span>
                ) : (
                  <span className="text-amber-700 dark:text-amber-400 font-medium">{gpsText}</span>
                )}
              </div>
            </div>
            <button type="button" onClick={handleCaptureGps} className="t-small text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] hover:underline font-semibold cursor-pointer shrink-0">
              {isAr ? 'تحديث GPS' : isEn ? 'Refresh GPS' : 'Actualiser GPS'}
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between t-cap">
              <span className="font-semibold text-black dark:text-white">{isAr ? 'التوقيع الإلكتروني للزائر' : isEn ? 'Visitor Touch Signature' : "Signature Tactile de l'Acquéreur (Sur l'écran)"}</span>
              <button type="button" onClick={clearSignature} className="flex items-center gap-1 text-black/70 dark:text-white/75 hover:text-[var(--brand-text,#BF431F)] dark:hover:text-[var(--brand-on-dark,#FF8F63)] transition-colors cursor-pointer">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isAr ? 'مسح' : isEn ? 'Clear' : 'Effacer'}</span>
              </button>
            </div>
            <div data-sq="card" data-sq-border="dashed" data-sq-stroke-w="2" className="relative bg-white dark:bg-[#22201E] overflow-hidden">
              <canvas
                ref={canvasRef}
                data-testid="bon-de-visite-signature-canvas"
                width={560}
                height={140}
                className="w-full h-[140px] touch-none cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasSignature && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center t-cap text-black/55 dark:text-white/55">
                  {isAr ? 'وقّع بالأصبع أو القلم هنا' : isEn ? 'Sign with mouse, finger, or stylus here' : 'Signez avec le doigt ou le stylet ici'}
                </div>
              )}
            </div>
            <p className="t-cap text-black/70 dark:text-white/75 leading-relaxed">
              * En signant, le client reconnaît avoir visité le bien par l&apos;entremise de l&apos;agence et s&apos;interdit de traiter directement avec le vendeur pendant 12 mois.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LabelSelect
              label={isAr ? 'انطباع الزيارة' : isEn ? 'Visit Impression' : 'Impression de Visite'}
              value={clientImpression}
              onChange={(val) => setClientImpression(val as 'Interested' | 'NeedsNegotiation' | 'OfferSubmitted' | 'PriceTooHigh' | 'Unfavorable')}
              options={[
                { value: 'Interested', label: 'Très Intéressé (Candidat Solide)' },
                { value: 'NeedsNegotiation', label: 'Intéressé sous réserve de négociation' },
                { value: 'OfferSubmitted', label: 'Offre Ferme Soumise' },
                { value: 'PriceTooHigh', label: 'Prix jugé trop élevé' },
                { value: 'Unfavorable', label: 'Défavorable (Ne correspond pas)' },
              ]}
            />
            <LabelInput type="number" label={isAr ? 'العرض المالي المقترح (د.ج)' : isEn ? 'Client Counter-Offer (DZD)' : 'Proposition de Prix Client (DZD)'} value={counterOfferDzd} onChange={(v) => setCounterOfferDzd(Number(v))} />
          </div>
          <LabelInput label={isAr ? 'ملاحظات الزيارة' : isEn ? 'Visit Notes' : 'Notes de Visite & Remarques du Négociateur'} value={feedbackNotes} onChange={setFeedbackNotes} placeholder="Ex: Travaux peinture à prévoir, visite seconde fois..." />
          <div className="flex items-center justify-between pt-4 border-t border-[var(--atr-divider)]">
            <div className="flex items-center gap-2 t-small text-emerald-600 font-semibold">
              <CheckCircle className="w-4 h-4" />
              <span>{isAr ? 'نسخة واتساب جاهزة' : isEn ? 'WhatsApp slip ready' : 'Copie WhatsApp générée automatiquement'}</span>
            </div>
            <div className="flex items-center gap-2">
              <AtriumButton variant="secondary" onClick={onClose} type="button">{isAr ? 'إلغاء' : isEn ? 'Cancel' : 'Annuler'}</AtriumButton>
              <AtriumButton variant="primary" icon={<CheckCircle size={14} />} type="submit">{isAr ? 'اعتماد وصل الزيارة' : isEn ? 'Certify Visit Slip' : 'Certifier le Bon de Visite'}</AtriumButton>
            </div>
          </div>
        </form>
      </div>
    </KineticModalShell>
  );
};

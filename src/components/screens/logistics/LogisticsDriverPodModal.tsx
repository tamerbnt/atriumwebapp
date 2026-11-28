import React, { useEffect, useRef, useState } from 'react';
import { PenTool, MapPin, CheckCircle2, RotateCcw, X } from 'lucide-react';
import { LogisticsShipment } from '../../../types';
import { AtriumButton } from '../../ui/AtriumButton';
import { KineticModalShell, useRetainedModalValue } from '../../ui/kinetic';

interface LogisticsDriverPodModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: LogisticsShipment | null;
  language: string;
  onSubmitPod: (payload: {
    parcelId: string;
    trackingCode: string;
    driverName: string;
    outcome: 'Delivered' | 'Postponed' | 'Returned';
    reasonCode?: string;
    signatureSvg?: string;
    gpsLat?: number;
    gpsLng?: number;
    recipientSignedName?: string;
    notes?: string;
  }) => void;
}

const REASON_OPTIONS = [
  { code: 'REC_ABSENT', fr: 'Destinataire absent / Injoignable', en: 'Recipient absent / unreachable', ar: 'المستلم غائب / الهاتف مغلق' },
  { code: 'REC_POSTPONED', fr: 'Report demandé par le destinataire', en: 'Postponed by recipient request', ar: 'تأجيل بطلب من المستلم' },
  { code: 'REC_REFUSED_DEFECT', fr: 'Colis refusé / Avarie apparente', en: 'Refused / damaged packaging', ar: 'رفض الاستلام / طرد متضرر' },
  { code: 'REC_WRONG_ADDRESS', fr: 'Adresse ou wilaya incomplète', en: 'Wrong or incomplete address', ar: 'عنوان غير دقيق أو ناقص' },
];

export const LogisticsDriverPodModal: React.FC<LogisticsDriverPodModalProps> = ({
  isOpen,
  onClose,
  shipment: rawShipment,
  language,
  onSubmitPod,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const shipment = useRetainedModalValue(isOpen ? rawShipment : null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const pointsRef = useRef<Array<Array<{ x: number; y: number }>>>([]);

  const [outcome, setOutcome] = useState<'Delivered' | 'Postponed' | 'Returned'>('Delivered');
  const [reasonCode, setReasonCode] = useState('REC_ABSENT');
  const [driverName, setDriverName] = useState(rawShipment?.assignedDriverName || 'Livreur Hub');
  const [recipientSignedName, setRecipientSignedName] = useState(rawShipment?.recipientName || '');
  const [notes, setNotes] = useState('');
  const [hasStroke, setHasStroke] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string>('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isOpen || !rawShipment) return;
    setOutcome('Delivered');
    setReasonCode('REC_ABSENT');
    setDriverName(rawShipment.assignedDriverName || 'Livreur Hub');
    setRecipientSignedName(rawShipment.recipientName || '');
    setNotes('');
    setHasStroke(false);
    setGpsStatus('');
    setGpsCoords(null);
    pointsRef.current = [];
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [isOpen, rawShipment?.id, rawShipment?.assignedDriverName, rawShipment?.recipientName]);

  const getLocalPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    const p = getLocalPos(e);
    pointsRef.current.push([p]);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#18181B';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const p = getLocalPos(e);
    const currentStroke = pointsRef.current[pointsRef.current.length - 1];
    currentStroke.push(p);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    setHasStroke(true);
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    pointsRef.current = [];
    setHasStroke(false);
  };

  const buildSvgSignature = (): string | undefined => {
    if (pointsRef.current.length === 0) return undefined;
    const paths = pointsRef.current
      .filter((stroke) => stroke.length > 0)
      .map((stroke) => {
        const d = stroke.map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${pt.x} ${pt.y}`).join(' ');
        return `<path d="${d}" fill="none" stroke="#18181B" stroke-width="2" stroke-linecap="round" />`;
      })
      .join('');
    if (!paths) return undefined;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 120">${paths}</svg>`;
  };

  const handleCaptureGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus(isAr ? 'المتصفح لا يدعم GPS — تم الحفظ بدون إحداثيات' : 'Géolocalisation indisponible — saisie manuelle conservée');
      return;
    }
    setGpsStatus(isAr ? 'جاري تحديد الموقع...' : 'Acquisition GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setGpsCoords({ lat, lng });
        setGpsStatus(`${lat}, ${lng}`);
      },
      () => {
        setGpsStatus(isAr ? 'تعذر الوصول إلى GPS — استكمال التوثيق' : 'GPS refusé/indisponible — POD autorisé sans GPS');
      },
      { timeout: 3000 }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipment) return;
    const signatureSvg = buildSvgSignature();
    onSubmitPod({
      parcelId: shipment.id,
      trackingCode: shipment.trackingCode,
      driverName: driverName.trim() || shipment.assignedDriverName || 'Livreur Hub',
      outcome,
      reasonCode: outcome === 'Delivered' ? undefined : reasonCode,
      signatureSvg,
      gpsLat: gpsCoords?.lat,
      gpsLng: gpsCoords?.lng,
      recipientSignedName: recipientSignedName.trim() || shipment.recipientName,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <KineticModalShell
      isOpen={isOpen && Boolean(rawShipment)}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      scrimClassName="bg-black/60"
      ariaLabel={isAr ? 'إثبات التسليم الإلكتروني' : isEn ? 'Driver Proof of Delivery (POD)' : 'Preuve de Livraison (POD)'}
    >
      {shipment && (
        <div
          data-sq="panel"
          data-sq-border="solid"
          dir={isAr ? 'rtl' : 'ltr'}
          className="bg-white dark:bg-[#262422] text-black dark:text-white w-full [--sq-stroke:var(--sq-stroke-pop)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="px-5 py-4 border-b border-[var(--atr-divider)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div data-sq="tile" data-sq-border="none" className="w-9 h-9 bg-[#d4522f]/12 text-[var(--brand-text,#BF431F)] dark:text-[#FF8F63] flex items-center justify-center">
                <PenTool className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="t-card font-semibold text-black dark:text-white">
                  {isAr ? 'توقيع وإثبات التسليم (POD)' : isEn ? 'Driver Proof of Delivery (POD)' : 'Preuve de Livraison Chauffeur (POD)'}
                </h2>
                <p className="t-cap text-black/55 dark:text-white/55">
                  <span className="tabular-nums font-semibold text-[var(--brand-text,#BF431F)] dark:text-[#FF8F63]">{shipment.trackingCode}</span>
                  {' · '}
                  {shipment.recipientName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={isAr ? 'إغلاق' : isEn ? 'Close' : 'Fermer'}
              className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="t-cap font-medium text-black/75 dark:text-white/75">
                  {isAr ? 'النتيجة' : isEn ? 'Delivery Outcome' : 'Issue de la tournée'}
                </span>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value as 'Delivered' | 'Postponed' | 'Returned')}
                  className="mt-1 w-full rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] bg-[#F7F3EE] dark:bg-[#181614] text-black dark:text-white px-3 py-2 t-small"
                >
                  <option value="Delivered">{isAr ? 'تم التسليم بنجاح' : isEn ? 'Delivered' : 'Livré au destinataire'}</option>
                  <option value="Postponed">{isAr ? 'مؤجل / محاولة ثانية' : isEn ? 'Postponed' : 'Reporté (Nouvelle tentative)'}</option>
                  <option value="Returned">{isAr ? 'مرتجع للمرسل' : isEn ? 'Returned' : 'Retourné Expéditeur'}</option>
                </select>
              </label>

              <label className="block">
                <span className="t-cap font-medium text-black/75 dark:text-white/75">
                  {isAr ? 'السائق / الموزع' : isEn ? 'Driver Name' : 'Chauffeur / Livreur'}
                </span>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] bg-[#F7F3EE] dark:bg-[#181614] text-black dark:text-white px-3 py-2 t-small"
                />
              </label>
            </div>

            {outcome !== 'Delivered' && (
              <label className="block">
                <span className="t-cap font-medium text-black/75 dark:text-white/75">
                  {isAr ? 'سبب عدم التسليم' : isEn ? 'Reason Code' : 'Motif structuré'}
                </span>
                <select
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  className="mt-1 w-full rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] bg-[#F7F3EE] dark:bg-[#181614] text-black dark:text-white px-3 py-2 t-small"
                >
                  {REASON_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.code} — {isAr ? opt.ar : isEn ? opt.en : opt.fr}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block">
              <span className="t-cap font-medium text-black/75 dark:text-white/75">
                {isAr ? 'اسم الموقع عند الاستلام' : isEn ? 'Signed By' : 'Signataire / Réceptionnaire'}
              </span>
              <input
                type="text"
                value={recipientSignedName}
                onChange={(e) => setRecipientSignedName(e.target.value)}
                className="mt-1 w-full rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] bg-[#F7F3EE] dark:bg-[#181614] text-black dark:text-white px-3 py-2 t-small"
              />
            </label>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="t-cap font-medium text-black/75 dark:text-white/75">
                  {isAr ? 'لوحة التوقيع الإلكتروني' : isEn ? 'Recipient Signature Pad' : 'Signature électronique du destinataire'}
                </span>
                <button
                  type="button"
                  onClick={handleClearCanvas}
                  className="t-cap text-[var(--brand-text,#BF431F)] dark:text-[#FF8F63] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isAr ? 'مسح' : isEn ? 'Clear' : 'Effacer'}</span>
                </button>
              </div>
              <div className="rounded-[var(--rad-ctl)] border border-dashed border-[var(--atr-divider)] bg-[#FCF9F6] overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={420}
                  height={120}
                  data-testid="pod-signature-canvas"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  className="w-full h-[120px] touch-none cursor-crosshair block"
                />
              </div>
              {hasStroke && (
                <p className="t-cap text-emerald-600 dark:text-emerald-400">
                  {isAr ? 'تم تسجيل التوقيع الرقمي' : isEn ? 'Digital signature captured' : 'Signature numérique capturée'}
                </p>
              )}
            </div>

            <div data-sq="card" data-sq-border="none" className="flex items-center justify-between gap-3 p-3 bg-[#F5F1EC] dark:bg-[#22201E]">
              <div className="t-cap text-black/75 dark:text-white/75 flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 shrink-0 text-[var(--brand-text,#BF431F)] dark:text-[#FF8F63]" />
                <span className="truncate">
                  {gpsStatus || (isAr ? 'إحداثيات GPS اختيارية' : isEn ? 'Optional GPS stamp' : 'Horodatage GPS optionnel')}
                </span>
              </div>
              <AtriumButton type="button" variant="secondary" size="sm" onClick={handleCaptureGps}>
                <MapPin className="w-3.5 h-3.5" />
                <span>{isAr ? 'التقاط GPS' : isEn ? 'Tag GPS' : 'Capturer GPS'}</span>
              </AtriumButton>
            </div>

            <label className="block">
              <span className="t-cap font-medium text-black/75 dark:text-white/75">
                {isAr ? 'ملاحظات الموزع' : isEn ? 'Notes' : 'Observations terrain'}
              </span>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isAr ? 'مثال: تسليم ببطاقة التعريف' : 'Ex: Remis en main propre devant immeuble'}
                className="mt-1 w-full rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] bg-[#F7F3EE] dark:bg-[#181614] text-black dark:text-white px-3 py-2 t-small"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--atr-divider)]">
              <AtriumButton type="button" variant="secondary" size="md" onClick={onClose}>
                {isAr ? 'إلغاء' : isEn ? 'Cancel' : 'Annuler'}
              </AtriumButton>
              <AtriumButton type="submit" variant="primary" size="md">
                <CheckCircle2 className="w-4 h-4" />
                <span>{isAr ? 'حفظ إثبات التسليم' : isEn ? 'Save POD & Update Status' : 'Valider POD & Mettre à jour'}</span>
              </AtriumButton>
            </div>
          </form>
        </div>
      )}
    </KineticModalShell>
  );
};

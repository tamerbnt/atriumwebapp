import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, CheckCircle2, MessageSquare, Share2, X, MapPin, Clock } from 'lucide-react';
import { LogisticsParcelEvent, LogisticsShipment } from '../../../types';
import { buildPublicTrackingTimeline } from '../../../utils/logisticsDepth';
import { AtriumButton } from '../../ui/AtriumButton';
import { showToast } from '../../../services/store';

interface LogisticsTrackingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: LogisticsShipment | null;
  events: LogisticsParcelEvent[];
  language: string;
  onLogNotification: (params: {
    parcelId: string;
    trackingCode: string;
    channel: 'sms' | 'whatsapp';
    recipientPhone: string;
    notes: string;
  }) => void;
}

export const LogisticsTrackingDrawer: React.FC<LogisticsTrackingDrawerProps> = ({
  isOpen,
  onClose,
  shipment,
  events,
  language,
  onLogNotification,
}) => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const [channel, setChannel] = useState<'sms' | 'whatsapp'>('sms');
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !shipment || typeof document === 'undefined') return null;

  const shipmentEvents = events.filter(
    (e) => e.parcelId === shipment.id || e.trackingCode === shipment.trackingCode
  );
  const { shareCode, steps } = buildPublicTrackingTimeline(
    shipment,
    shipmentEvents.map((e) => ({
      status: e.status,
      location: e.location,
      notes: e.notes,
      occurredAt: e.occurredAt,
    }))
  );

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/?track=${encodeURIComponent(shareCode)}`;
  const defaultMsg = isAr
    ? `تتبع طردك ${shipment.trackingCode} (${shareCode}): ${shipment.status} — ${shipment.destinationWilaya}`
    : isEn
    ? `Track your parcel ${shipment.trackingCode} (${shareCode}): ${shipment.status} — ${shipment.destinationWilaya}`
    : `Suivi colis ${shipment.trackingCode} (${shareCode}) : ${shipment.status} — ${shipment.destinationWilaya}`;

  const handleCopyShareLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setCopied(true);
      showToast(
        isAr
          ? `تم نسخ رابط التتبع ${shareCode}`
          : isEn
          ? `Tracking link ${shareCode} copied`
          : `Lien de tracking ${shareCode} copié`,
        'success'
      );
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast(shareUrl, 'info');
    }
  };

  const handleSendNotice = (e: React.FormEvent) => {
    e.preventDefault();
    const notes = (customMessage || defaultMsg).trim();
    onLogNotification({
      parcelId: shipment.id,
      trackingCode: shipment.trackingCode,
      channel,
      recipientPhone: shipment.recipientPhone,
      notes,
    });
    setCustomMessage('');
    showToast(
      isAr
        ? `تم تسجيل إشعار ${channel.toUpperCase()} للمستلم ${shipment.recipientName}`
        : isEn
        ? `${channel.toUpperCase()} notification logged for ${shipment.recipientName}`
        : `Avis ${channel.toUpperCase()} enregistré pour ${shipment.recipientName}`,
      'success'
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] bg-black/55 backdrop-blur-xs flex items-center justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={isAr ? 'تتبع وإشعارات الطرد' : isEn ? 'Parcel Tracking & Notice' : 'Tracking & Avis Destinataire'}
      dir={isAr ? 'rtl' : 'ltr'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#22201E] text-black dark:text-white border-s border-[var(--atr-divider)] w-full max-w-lg h-full flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--atr-divider)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Share2 className="w-5 h-5 text-[var(--brand-text,#BF431F)] dark:text-[#FF8F63] shrink-0" />
            <div className="min-w-0">
              <h2 className="t-card font-semibold text-black dark:text-white truncate">
                {shipment.trackingCode} · {shareCode}
              </h2>
              <p className="t-cap text-black/55 dark:text-white/55 truncate">
                {shipment.recipientName} ({shipment.recipientPhone}) · {shipment.destinationWilaya}
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

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div
            data-sq="card"
            className="p-4 bg-[#F5F1EC] dark:bg-[#171513] border border-[var(--atr-divider)] rounded-[var(--rad-card)] space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="t-cap font-semibold text-black/75 dark:text-white/75">
                {isAr ? 'رابط التتبع العام للمستلم' : isEn ? 'Public Recipient Tracking Link' : 'Lien Tracking Public Destinataire'}
              </span>
              <AtriumButton variant="secondary" size="sm" onClick={handleCopyShareLink}>
                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? (isAr ? 'تم النسخ' : 'Copié') : isAr ? 'نسخ الرابط' : isEn ? 'Copy Link' : 'Copier le lien'}</span>
              </AtriumButton>
            </div>
            <div className="text-xs font-mono break-all text-black/70 dark:text-white/70 bg-white dark:bg-[#22201E] px-3 py-2 rounded-[var(--rad-ctl)]">
              {shareUrl}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="t-label font-semibold text-black dark:text-white">
              {isAr ? 'مسار الشحنة الزمني' : isEn ? 'Parcel Journey Milestones' : 'Chronologie d’Acheminement'}
            </h3>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div
                  key={`${step.code}_${i}`}
                  className={`p-3 rounded-[var(--rad-ctl)] border flex items-start justify-between gap-3 ${
                    step.isCurrent
                      ? 'border-[var(--brand-text,#BF431F)] bg-[#FFF5F2] dark:bg-[#2B1B16]'
                      : step.completed
                      ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/25'
                      : 'border-[var(--atr-divider)] opacity-60'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="t-small font-semibold text-black dark:text-white">
                      {isAr ? step.titleAr : isEn ? step.titleEn : step.titleFr}
                    </div>
                    <div className="t-cap text-black/60 dark:text-white/60 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>{step.location}</span>
                    </div>
                    {step.notes && (
                      <div className="t-cap text-[var(--brand-text,#BF431F)] dark:text-[#FF8F63]">
                        {step.notes}
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-black/55 dark:text-white/55 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>{step.timestamp ? step.timestamp.slice(0, 16).replace('T', ' ') : '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSendNotice} className="space-y-3 border-t border-[var(--atr-divider)] pt-4">
            <h3 className="t-label font-semibold text-black dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[var(--brand-text,#BF431F)] dark:text-[#FF8F63]" />
              <span>
                {isAr ? 'إرسال إشعار للمستلم (SMS / WhatsApp)' : isEn ? 'Send Recipient Notification' : 'Notifier le Destinataire (SMS / WhatsApp)'}
              </span>
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="t-cap text-black/70 dark:text-white/70">
                  {isAr ? 'القناة' : isEn ? 'Channel' : 'Canal'}
                </span>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as 'sms' | 'whatsapp')}
                  className="mt-1 w-full rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] bg-[#F7F3EE] dark:bg-[#141210] text-black dark:text-white px-3 py-2 t-small"
                >
                  <option value="sms">SMS ({shipment.recipientPhone})</option>
                  <option value="whatsapp">WhatsApp ({shipment.recipientPhone})</option>
                </select>
              </label>
              <div className="flex flex-col justify-end">
                <span className="t-cap text-black/55 dark:text-white/55">
                  {isAr ? 'العميل:' : isEn ? 'Merchant:' : 'Marchand :'} {shipment.merchantName}
                </span>
              </div>
            </div>
            <label className="block">
              <span className="t-cap text-black/70 dark:text-white/70">
                {isAr ? 'نص الرسالة' : isEn ? 'Message Text' : 'Texte du message'}
              </span>
              <textarea
                rows={2}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={defaultMsg}
                className="mt-1 w-full rounded-[var(--rad-ctl)] border border-[var(--atr-divider)] bg-[#F7F3EE] dark:bg-[#141210] text-black dark:text-white px-3 py-2 t-small"
              />
            </label>
            <AtriumButton type="submit" variant="primary" size="md" className="w-full justify-center">
              <MessageSquare className="w-4 h-4" />
              <span>
                {isAr ? 'إرسال وتسجيل الإشعار' : isEn ? 'Send & Log Notification' : 'Envoyer & Journaliser l’Avis'}
              </span>
            </AtriumButton>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

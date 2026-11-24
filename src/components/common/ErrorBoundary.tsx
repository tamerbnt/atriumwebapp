import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Download, RefreshCw, Trash2 } from 'lucide-react';
import { AtriumButton } from '../ui/AtriumButton';
import {
  exportOfflineQueueSnapshot,
  getOfflineQueueStatus,
} from '../../lib/supabase/offlineQueue';
import { getInitialLanguageConfig, t } from '../../utils/i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Clears volatile app state caches while strictly preserving offline sync queues
 * (atrium_offline_mutation_queue_v1, atrium_offline_quarantine_v1) and device identity.
 */
export function clearVolatileCachePreservingQueue(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem('atrium_app_state_v2');
  storage.removeItem('atrium_app_state_v1');
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled App Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleExportQueue = () => {
    try {
      const snapshot = exportOfflineQueueSnapshot();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `atrium-offline-queue-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Could not export offline queue snapshot:', e);
    }
  };

  handleResetState = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        clearVolatileCachePreservingQueue(localStorage);
      }
    } catch (e) {
      console.warn('Could not clear localStorage:', e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { language } = getInitialLanguageConfig();
      const queueStatus = getOfflineQueueStatus();
      const unsyncedTotal = queueStatus.pendingCount + queueStatus.quarantinedCount;

      return (
        <div
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          className="min-h-screen w-screen flex items-center justify-center bg-[#0E0D0C] text-white p-[var(--s6,24px)] font-sans"
        >
          <div className="max-w-md w-full sq-elev-pop">
            <div
              data-sq="panel"
              data-sq-border="solid"
              data-surface="dark"
              className="w-full bg-[#262422] [--sq-stroke:url(#sq-spec-dark-pop)] rounded-[var(--r-panel,28px)] p-[var(--s7,32px)] text-center flex flex-col items-center gap-[var(--s6,24px)]"
            >
              <div
                data-sq="tile-lg"
                data-sq-border="solid"
                className="w-[var(--tile-lg,48px)] h-[var(--tile-lg,48px)] rounded-[var(--r-tile-lg,15px)] bg-amber-500/10 [--sq-stroke:rgba(245,158,11,0.3)] text-amber-500 flex items-center justify-center"
              >
                <AlertTriangle className="w-6 h-6" strokeWidth={2} />
              </div>

              <div className="flex flex-col gap-[var(--s2,8px)]">
                <h2 className="t-dialog text-white">
                  {t('recovery_console_title', language)}
                </h2>
                <p className="t-body text-white/75">
                  {t('recovery_console_desc', language)}
                </p>
              </div>

              {unsyncedTotal > 0 && (
                <div
                  data-sq="card"
                  data-sq-border="solid"
                  className="w-full p-[var(--s3,12px)] bg-amber-500/10 rounded-[var(--r-card,16px)] text-left [--sq-stroke:rgba(245,158,11,0.35)] t-cap text-amber-200"
                >
                  <div className="font-semibold">
                    {t('recovery_queue_preserved_title', language)}
                  </div>
                  <div className="mt-1 tabular-nums text-amber-100/85">
                    {t('recovery_queue_counts', language, {
                      pending: queueStatus.pendingCount,
                      quarantined: queueStatus.quarantinedCount,
                    })}
                  </div>
                </div>
              )}

              {this.state.error?.message && (
                <div
                  data-sq="card"
                  data-sq-border="solid"
                  className="w-full p-[var(--s3,12px)] bg-[#1D1B19] rounded-[var(--r-card,16px)] text-left [--sq-stroke:var(--sq-stroke-obsidian)] t-cap tabular-nums text-white/90 max-h-32 overflow-y-auto"
                >
                  {this.state.error.message}
                </div>
              )}

              <div className="w-full flex flex-col gap-[var(--s3,12px)]">
                <AtriumButton
                  type="button"
                  variant="primary"
                  size="md"
                  className="w-full"
                  icon={<RefreshCw className="w-4 h-4" strokeWidth={1.5} />}
                  onClick={this.handleReload}
                >
                  {t('recovery_reload_btn', language)}
                </AtriumButton>

                {unsyncedTotal > 0 && (
                  <AtriumButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    icon={<Download className="w-4 h-4" strokeWidth={1.5} />}
                    onClick={this.handleExportQueue}
                  >
                    {t('recovery_export_queue_btn', language)}
                  </AtriumButton>
                )}

                <AtriumButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  icon={<Trash2 className="w-4 h-4" strokeWidth={1.5} />}
                  onClick={this.handleResetState}
                >
                  {t('recovery_reset_cache_btn', language)}
                </AtriumButton>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

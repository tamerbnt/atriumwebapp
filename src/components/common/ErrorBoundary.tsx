import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { AtriumButton } from '../ui/AtriumButton';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
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

  handleResetState = () => {
    try {
      localStorage.removeItem('atrium_app_state_v2');
      localStorage.removeItem('atrium_app_state_v1');
    } catch (e) {
      console.warn('Could not clear localStorage:', e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen flex items-center justify-center bg-[#121110] text-white p-6 font-sans">
          <div className="max-w-md w-full bg-[#1C1A18] border border-neutral-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-white mb-2">
                Atrium Recovery Console
              </h1>
              <p className="text-sm text-neutral-400">
                A rendering issue was intercepted. You can reload the application or reset local cache to clean state.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-neutral-900/80 rounded-xl text-left border border-neutral-800 text-xs font-mono text-neutral-300 max-h-32 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <AtriumButton
                type="button"
                variant="primary"
                size="md"
                className="w-full"
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={this.handleReload}
              >
                Reload Application
              </AtriumButton>

              <AtriumButton
                type="button"
                variant="secondary"
                size="sm"
                className="w-full"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={this.handleResetState}
              >
                Clear Local Cache & Reset
              </AtriumButton>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

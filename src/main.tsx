import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';
import { configureMotion } from '@/atrium/core';
import { initFluidScrollbar } from './utils/fluidScrollbar';
import { initSquircleEngine } from './utils/squircle';
import { ensureModalTriggerTracking } from './components/ui/kinetic/kineticModalTrigger';
import { loadLocale } from './utils/i18n';
import { getResolvedInitialLanguage } from './services/store';

configureMotion({ tier: 'auto' });
initFluidScrollbar();
initSquircleEngine();
ensureModalTriggerTracking();

async function bootstrap() {
  await loadLocale(getResolvedInitialLanguage());
  createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

void bootstrap();

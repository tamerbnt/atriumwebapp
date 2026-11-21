import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';
import { configureMotion } from '@/atrium/core';
import { initFluidScrollbar } from './utils/fluidScrollbar';
import { initSquircleEngine } from './utils/squircle';
import { loadLocale } from './utils/i18n';
import { getResolvedInitialLanguage } from './services/store';

configureMotion({ tier: 'full' });
initFluidScrollbar();
initSquircleEngine();

async function bootstrap() {
  await loadLocale(getResolvedInitialLanguage());
  createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

void bootstrap();

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';
import { configureMotion } from '@/atrium';
import { initFluidScrollbar } from './utils/fluidScrollbar';
import { initSquircleEngine } from './utils/squircle';

configureMotion({ tier: 'full' });
initFluidScrollbar();
initSquircleEngine();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

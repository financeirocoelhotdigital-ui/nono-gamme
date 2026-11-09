import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

try {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      onNeedRefresh() {
        console.log('New content available');
      },
      onOfflineReady() {
        console.log('App is ready to work offline');
      },
    });
  }).catch((e) => {
    console.warn('PWA registration skipped:', e);
  });
} catch (e) {
  console.warn('PWA initialization error:', e);
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

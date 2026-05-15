import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { initErrorMonitoring, Sentry } from './lib/errorMonitoring';

// Initialise Sentry FIRST so any error during the rest of bootstrap is captured.
// No-op if VITE_SENTRY_DSN isn't set.
initErrorMonitoring();

// Register service worker for offline support and auto-updates
const updateSW = registerSW({
  onNeedRefresh() {
    // Force update when new version is available
    if (confirm('A new update is available. Reload to apply?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App is ready to work offline');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6 text-center">
          <div className="max-w-md flex flex-col gap-3">
            <h1 className="text-[20px] font-bold text-[#1a1a1a]">Something went wrong</h1>
            <p className="text-[15px] text-text-secondary">
              The app hit an unexpected error and our team has been notified. Please reload to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 inline-flex justify-center px-5 py-2 rounded-xl bg-primary text-white font-medium"
            >
              Reload
            </button>
          </div>
        </div>
      }
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
);

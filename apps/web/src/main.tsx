import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import { AuthProvider } from './context/AuthContext';
import { initSentryWeb, Sentry } from './sentry';
import { setApiBaseUrl } from '@repo/api-client';
import App from './App';
import './index.css';

initSentryWeb();

const envApiUrl = import.meta.env.VITE_API_BASE_URL || (typeof process !== 'undefined' ? process.env.VITE_API_BASE_URL : '');
if (envApiUrl) {
  setApiBaseUrl(envApiUrl);
  console.log(`[Ledger Web] Initialized API Base URL: ${envApiUrl}`);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ error }) => (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] p-6 text-center">
          <div className="max-w-md bg-white p-8 rounded-xl border border-stone-200 shadow-sm">
            <h2 className="text-xl font-bold text-stone-900 mb-2 font-display">Something went wrong</h2>
            <p className="text-sm text-stone-500 mb-6">
              An unexpected application error occurred. An error report has been logged.
            </p>
            <p className="text-xs text-stone-400 font-mono mb-6 bg-stone-50 p-2 rounded">
              {(error as any)?.message ? String((error as any).message) : String(error)}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-[#0B4F4A] hover:bg-[#083D39] text-white font-medium text-sm rounded-lg transition-colors"
            >
              Reload Ledger
            </button>
          </div>
        </div>
      )}
    >
      <Provider store={store}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Provider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);

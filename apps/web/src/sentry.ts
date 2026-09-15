import * as Sentry from '@sentry/react';

export function initSentryWeb() {
  const dsn = import.meta.env.VITE_SENTRY_DSN_WEB;
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

export { Sentry };

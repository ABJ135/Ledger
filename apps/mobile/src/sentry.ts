import * as Sentry from '@sentry/react-native';

export function initSentryMobile() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN_MOBILE;
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
    enableAutoSessionTracking: true,
  });
}

export { Sentry };

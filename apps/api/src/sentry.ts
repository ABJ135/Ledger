import * as SentryNode from '@sentry/node';

export function initSentryApi() {
  const dsn = process.env.SENTRY_DSN_API;
  if (!dsn) {
    console.log('[Sentry API] SENTRY_DSN_API not configured; Sentry tracking is idle.');
    return;
  }

  SentryNode.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
  });
  console.log('[Sentry API] Sentry initialized successfully.');
}

export const Sentry = {
  init: (options: SentryNode.NodeOptions) => SentryNode.init(options),
  captureException: (err: any, hint?: any): string => SentryNode.captureException(err, hint),
  captureMessage: (msg: string): string => SentryNode.captureMessage(msg),
};

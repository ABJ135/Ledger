import 'reflect-metadata';
import { initSentryApi, Sentry } from '../src/sentry';
import { SentryFilter } from '../src/common/filters/sentry.filter';
import { HttpException, HttpStatus, InternalServerErrorException, BadRequestException } from '@nestjs/common';

async function runSentryE2ETests() {
  console.log('\n=============================================');
  console.log('Starting Step 11 Sentry Error Monitoring E2E Tests');
  console.log('=============================================\n');

  // 1. Test init without DSN
  console.log('[1] Testing Sentry initialization idle mode (no DSN)...');
  delete process.env.SENTRY_DSN_API;
  initSentryApi();
  console.log('  ✓ Handled missing DSN gracefully (idle mode).');

  // 2. Test init with DSN
  console.log('\n[2] Testing Sentry initialization active mode (with DSN)...');
  process.env.SENTRY_DSN_API = 'https://dummyPublicKey@o0.ingest.sentry.io/0';
  initSentryApi();
  console.log('  ✓ Initialized Sentry client successfully.');

  // 3. Test SentryFilter exception capture logic
  console.log('\n[3] Testing Sentry global exception filter...');
  const capturedExceptions: any[] = [];
  const originalCapture = Sentry.captureException;
  Sentry.captureException = (err: any) => {
    capturedExceptions.push(err);
    return 'mock-event-id';
  };

  const mockHttpAdapter = {
    reply: (response: any, body: any, statusCode: number) => {
      response.status = statusCode;
      response.body = body;
    },
    end: () => {},
  };

  const filter = new SentryFilter(mockHttpAdapter as any);

  const mockHost = (statusRef: { status?: number; body?: any }) => ({
    switchToHttp: () => ({
      getResponse: () => statusRef,
      getRequest: () => ({ url: '/test' }),
      getNext: () => {},
    }),
    getType: () => 'http',
  });

  // A. Internal Server Error (500) -> Should capture
  capturedExceptions.length = 0;
  const status500: any = {};
  const error500 = new InternalServerErrorException('Database failure simulation');
  try {
    filter.catch(error500, mockHost(status500) as any);
  } catch {}
  if (capturedExceptions.length !== 1) {
    throw new Error('500 InternalServerErrorException was NOT captured by SentryFilter!');
  }
  console.log('  ✓ 500 InternalServerError captured and forwarded to Sentry.');

  // B. Bad Request Error (400) -> Should NOT capture (avoids noise)
  capturedExceptions.length = 0;
  const status400: any = {};
  const error400 = new BadRequestException('Validation failed');
  try {
    filter.catch(error400, mockHost(status400) as any);
  } catch {}
  if (capturedExceptions.length !== 0) {
    throw new Error('400 BadRequestException was incorrectly reported to Sentry!');
  }
  console.log('  ✓ 400 BadRequest ignored to prevent operational alert noise.');

  // C. Unhandled Error (non-HttpException) -> Should capture
  capturedExceptions.length = 0;
  const statusUnhandled: any = {};
  const unhandledError = new Error('Unexpected panic or crash');
  try {
    filter.catch(unhandledError, mockHost(statusUnhandled) as any);
  } catch {}
  if (capturedExceptions.length !== 1) {
    throw new Error('Unhandled generic error was NOT captured by SentryFilter!');
  }
  console.log('  ✓ Unhandled runtime Exception captured and forwarded to Sentry.');

  // Restore
  Sentry.captureException = originalCapture;
  delete process.env.SENTRY_DSN_API;

  console.log('\n=============================================');
  console.log('🎉 ALL STEP 11 SENTRY MONITORING TESTS PASSED!');
  console.log('=============================================\n');
}

runSentryE2ETests().catch((err) => {
  console.error('\n❌ STEP 11 SENTRY TEST FAILED:');
  console.error(err);
  process.exit(1);
});

import { Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Sentry } from '../../sentry';

@Catch()
export class SentryFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (process.env.SENTRY_DSN_API) {
      if (exception instanceof HttpException) {
        // Only report 5xx internal server errors to Sentry
        if (exception.getStatus() >= HttpStatus.INTERNAL_SERVER_ERROR) {
          Sentry.captureException(exception);
        }
      } else {
        Sentry.captureException(exception);
      }
    }
    super.catch(exception, host);
  }
}

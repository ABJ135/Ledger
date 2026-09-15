import 'reflect-metadata';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { initSentryApi } from './sentry';
import { SentryFilter } from './common/filters/sentry.filter';

async function bootstrap() {
  initSentryApi();

  const app = await NestFactory.create(AppModule);

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryFilter(httpAdapter));

  app.use(cookieParser());

  const corsOrigin = process.env.CORS_ORIGIN_WEB || 'http://localhost:5173';
  app.enableCors({
    origin: corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Backend API running on http://localhost:${port}`);
}

bootstrap();

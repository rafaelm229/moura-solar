import type { IdentityRequest } from './identity/identity.guard';
import { writeFileSync } from 'node:fs';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import pino from 'pino';
import { randomUUID } from 'node:crypto';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { json, urlencoded } from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { ApiExceptionFilter } from './shared/api-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  const log = pino();
  app.use(helmet());
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ extended: true, limit: '25mb' }));
  app.enableCors({ origin: config.getOrThrow<string>('WEB_ORIGIN'), credentials: true });
  app.use((request: Request, response: Response, next: NextFunction) => {
    const incoming = request.header('x-request-id');
    const requestId =
      typeof incoming === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(incoming)
        ? incoming
        : randomUUID();
    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);
    response.setHeader('cache-control', 'no-store');
    const start = Date.now();
    response.on('finish', () =>
      log.info(
        {
          traceId: requestId,
          method: request.method,
          status: response.statusCode,
          durationMs: Date.now() - start,
          actorId: (request as Partial<IdentityRequest>).actor?.id,
          organizationId: (request as Partial<IdentityRequest>).actor?.organizationId,
        },
        'request completed',
      ),
    );
    next();
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Moura Solar API')
      .setVersion('1.0')
      .addCookieAuth('ms_access')
      .build(),
  );
  if (process.env.EXPORT_OPENAPI) {
    writeFileSync(process.env.EXPORT_OPENAPI, JSON.stringify(document, null, 2) + '\n');
    await app.close();
    return;
  }
  SwaggerModule.setup('api/v1/docs', app, document);
  const port = config.getOrThrow<number>('API_PORT');
  await app.listen(port, '0.0.0.0');
}

void bootstrap();

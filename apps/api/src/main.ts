import { randomUUID } from 'node:crypto';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { ApiExceptionFilter } from './shared/api-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use((request: Request, response: Response, next: NextFunction) => {
    const incoming = request.header('x-request-id');
    const requestId = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);
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

  const port = config.getOrThrow<number>('API_PORT');
  await app.listen(port, '0.0.0.0');
}

void bootstrap();

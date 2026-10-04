import { randomUUID } from 'node:crypto';

import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import type { ApiErrorResponse } from '@moura-solar/contracts';
import type { Request, Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const traceId = request.requestId ?? randomUUID();
    if (status >= 500) {
      console.error('API request failed', { traceId, status });
    }

    const body = exception instanceof HttpException ? exception.getResponse() : null;
    const details =
      typeof body === 'object' &&
      body !== null &&
      'details' in body &&
      typeof body.details === 'object' &&
      body.details !== null
        ? (body.details as Record<string, unknown>)
        : {};

    const payload: ApiErrorResponse = {
      code: this.codeFor(exception, status),
      message: this.messageFor(exception, status),
      details,
      traceId,
    };

    response.status(status).json(payload);
  }

  private codeFor(exception: unknown, status: number): string {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'object' && 'code' in body) return String(body.code);
    }
    if (exception instanceof HttpException && status === HttpStatus.SERVICE_UNAVAILABLE) {
      return 'SERVICE_NOT_READY';
    }
    return status >= 500 ? 'INTERNAL_ERROR' : `HTTP_${status}`;
  }

  private messageFor(exception: unknown, status: number): string {
    if (exception instanceof HttpException) {
      return exception.message;
    }
    return status >= 500 ? 'Ocorreu um erro interno.' : 'A requisição não pôde ser processada.';
  }
}

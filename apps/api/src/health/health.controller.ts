import { Public } from '../identity/identity.guard';
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import type { HealthResponse } from '@moura-solar/contracts';

import { PrismaService } from '../database/prisma.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  live(): HealthResponse {
    return this.response('ok');
  }

  @Get('ready')
  async ready(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.response('ok');
    } catch {
      throw new ServiceUnavailableException('Database is not ready');
    }
  }

  private response(status: HealthResponse['status']): HealthResponse {
    return {
      status,
      service: 'moura-solar-api',
      version: process.env.npm_package_version ?? '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }
}

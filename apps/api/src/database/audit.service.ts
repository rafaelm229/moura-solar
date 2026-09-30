import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from './prisma.service';

export type Tx = Prisma.TransactionClient;

export interface AuditParams {
  organizationId?: string | null;
  actorId?: string | null;
  action: string;
  entityId?: string | null;
  traceId?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: AuditParams, tx?: Tx) {
    const client = tx ?? this.prisma;
    return client.auditEvent.create({
      data: {
        organizationId: params.organizationId ?? null,
        actorId: params.actorId ?? null,
        action: params.action,
        entityId: params.entityId ?? null,
        traceId: params.traceId || randomUUID(),
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { fail, hash } from './security';
import type { ContextDto } from './identity.dto';

export type Tx = Prisma.TransactionClient;
@Injectable()
export class IdentityStore {
  constructor(readonly db: PrismaService) {}
  async transaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.db.$transaction(work, { isolationLevel: 'Serializable', timeout: 15000 });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < 3
        )
          continue;
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          ['P2002', 'P2034'].includes(error.code)
        )
          fail(
            'IDENTITY_CONFLICT',
            'O registro mudou ou já existe. Atualize e tente novamente.',
            409,
          );
        throw error;
      }
    }
  }
  audit(
    tx: Tx,
    action: string,
    actor: { organizationId: string; id: string } | null,
    entityId: string | null,
    traceId: string,
  ) {
    return tx.auditEvent.create({
      data: {
        action,
        organizationId: actor?.organizationId,
        actorId: actor?.id,
        entityId,
        traceId,
      },
    });
  }
  async command<T extends Prisma.InputJsonObject>(
    actor: ContextDto,
    key: string,
    input: unknown,
    permission: string,
    work: (tx: Tx) => Promise<T>,
    organization = true,
  ): Promise<T> {
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(key))
      fail('IDEMPOTENCY_REQUIRED', 'Informe uma chave de idempotência válida.');
    const fingerprint = hash(JSON.stringify(input));
    const commandKey = `${actor.id}:${key}`;
    return this.transaction(async (tx) => {
      await this.authorize(tx, actor, permission, organization);
      const prior = await tx.identityCommand.findUnique({ where: { key: commandKey } });
      if (prior) {
        if (prior.fingerprint !== fingerprint)
          fail('IDEMPOTENCY_CONFLICT', 'Chave já utilizada em outra operação.', 409);
        return prior.result as T;
      }
      const result = await work(tx);
      await tx.identityCommand.create({
        data: { key: commandKey, actorId: actor.id, fingerprint, result },
      });
      return result;
    });
  }
  async authorize(tx: Tx, actor: ContextDto, permission: string, organization = true) {
    const session = await tx.session.findFirst({
      where: {
        id: actor.sessionId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        membership: {
          id: actor.id,
          status: 'active',
          organizationId: actor.organizationId,
          role: {
            grants: {
              some: { permission, ...(organization ? { scope: 'organization' } : {}) },
            },
          },
        },
      },
    });
    if (!session) fail('ACCESS_DENIED', 'Você não tem permissão para esta ação.', 403);
  }
  async requireAdministrator(tx: Tx, organizationId: string) {
    const count = await tx.membership.count({
      where: {
        organizationId,
        status: 'active',
        role: {
          AND: [
            { grants: { some: { permission: 'users:manage', scope: 'organization' } } },
            { grants: { some: { permission: 'roles:manage', scope: 'organization' } } },
          ],
        },
      },
    });
    if (!count)
      fail(
        'LAST_ADMINISTRATOR',
        'Mantenha pelo menos um administrador ativo com gestão de usuários e papéis.',
        409,
      );
  }
}

import type { Prisma, PrismaClient } from '@prisma/client';

export type ImportOutboxClaim = {
  id: string;
  organizationId: string;
  importId: string;
  eventType: string;
  dedupeKey: string;
  payload: Prisma.JsonValue;
  attempts: number;
  leaseOwner: string;
  leaseUntil: Date;
};

function validateLease(workerId: string, now: Date, leaseUntil: Date): void {
  if (!/^[a-zA-Z0-9._:-]{1,120}$/.test(workerId)) throw new Error('Invalid worker identity');
  if (
    !Number.isFinite(now.getTime()) ||
    !Number.isFinite(leaseUntil.getTime()) ||
    leaseUntil <= now
  )
    throw new Error('Lease expiration must be after the current time');
}

export async function claimNextImportOutbox(
  prisma: PrismaClient,
  workerId: string,
  now: Date,
  leaseUntil: Date,
): Promise<ImportOutboxClaim | null> {
  validateLease(workerId, now, leaseUntil);
  const rows = await prisma.$queryRaw<ImportOutboxClaim[]>`
    WITH next_event AS (
      SELECT id
      FROM import_outbox
      WHERE event_type = 'ENERGY_BILL_IMPORT_QUEUED'
        AND (
          (status = 'PENDING' AND available_at <= ${now})
          OR (status = 'PROCESSING' AND lease_until <= ${now})
        )
      ORDER BY available_at, created_at, id
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE import_outbox AS event
    SET status = 'PROCESSING',
        attempts = event.attempts + 1,
        lease_owner = ${workerId},
        lease_until = ${leaseUntil},
        heartbeat_at = ${now},
        updated_at = ${now}
    FROM next_event
    WHERE event.id = next_event.id
    RETURNING
      event.id,
      event.organization_id AS "organizationId",
      event.import_id AS "importId",
      event.event_type AS "eventType",
      event.dedupe_key AS "dedupeKey",
      event.payload,
      event.attempts,
      event.lease_owner AS "leaseOwner",
      event.lease_until AS "leaseUntil"
  `;
  return rows[0] ?? null;
}

export async function heartbeatImportOutbox(
  prisma: PrismaClient,
  claim: Pick<ImportOutboxClaim, 'id' | 'leaseOwner'>,
  now: Date,
  leaseUntil: Date,
): Promise<boolean> {
  validateLease(claim.leaseOwner, now, leaseUntil);
  const result = await prisma.importOutbox.updateMany({
    where: {
      id: claim.id,
      status: 'PROCESSING',
      leaseOwner: claim.leaseOwner,
      leaseUntil: { gt: now },
    },
    data: { heartbeatAt: now, leaseUntil, updatedAt: now },
  });
  return result.count === 1;
}

export async function completeImportOutbox(
  prisma: PrismaClient,
  claim: Pick<ImportOutboxClaim, 'id' | 'leaseOwner'>,
  now: Date,
): Promise<boolean> {
  const result = await prisma.importOutbox.updateMany({
    where: {
      id: claim.id,
      status: 'PROCESSING',
      leaseOwner: claim.leaseOwner,
      leaseUntil: { gt: now },
    },
    data: {
      status: 'DONE',
      completedAt: now,
      leaseOwner: null,
      leaseUntil: null,
      updatedAt: now,
    },
  });
  return result.count === 1;
}

export async function releaseImportOutbox(
  prisma: PrismaClient,
  claim: Pick<ImportOutboxClaim, 'id' | 'leaseOwner'>,
  now: Date,
  availableAt: Date,
  safeErrorCode: string,
): Promise<boolean> {
  if (!/^[a-zA-Z0-9._:-]{1,120}$/.test(claim.leaseOwner))
    throw new Error('Invalid worker identity');
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid current time');
  if (!Number.isFinite(availableAt.getTime()) || availableAt < now)
    throw new Error('Availability time must not be in the past');
  if (!/^[A-Z0-9_]{1,80}$/.test(safeErrorCode)) throw new Error('Invalid safe error code');
  const result = await prisma.importOutbox.updateMany({
    where: {
      id: claim.id,
      status: 'PROCESSING',
      leaseOwner: claim.leaseOwner,
      leaseUntil: { gt: now },
    },
    data: {
      status: 'PENDING',
      availableAt,
      leaseOwner: null,
      leaseUntil: null,
      lastErrorCode: safeErrorCode,
      updatedAt: now,
    },
  });
  return result.count === 1;
}

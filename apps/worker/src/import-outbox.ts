import type { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

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

export type PreparedExtractionAttempt = {
  id: string;
  importId: string;
  outboxId: string;
  attemptNumber: number;
  correlationId: string;
  status: string;
  externalOperationId: string | null;
  errorCode: string | null;
  documentRef: {
    backend: string;
    bucket: string;
    key: string;
    sha256: string;
    mimeType: string;
    byteSize: number;
  };
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

function toPrepared(
  attempt: {
    id: string;
    importId: string;
    outboxId: string | null;
    attemptNumber: number;
    correlationId: string;
    status: string;
    externalOperationId: string | null;
    errorCode: string | null;
  },
  documentRef: PreparedExtractionAttempt['documentRef'],
): PreparedExtractionAttempt {
  if (!attempt.outboxId) throw new Error('Extraction attempt has no source outbox event');
  return {
    id: attempt.id,
    importId: attempt.importId,
    outboxId: attempt.outboxId,
    attemptNumber: attempt.attemptNumber,
    correlationId: attempt.correlationId,
    status: attempt.status,
    externalOperationId: attempt.externalOperationId,
    errorCode: attempt.errorCode,
    documentRef,
  };
}

export async function prepareImportAttempt(
  prisma: PrismaClient,
  claim: ImportOutboxClaim,
  now: Date,
): Promise<PreparedExtractionAttempt | null> {
  if (!/^[a-zA-Z0-9._:-]{1,120}$/.test(claim.leaseOwner))
    throw new Error('Invalid worker identity');
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid current time');

  return prisma.$transaction(
    async (tx) => {
      const event = await tx.importOutbox.findFirst({
        where: {
          id: claim.id,
          importId: claim.importId,
          organizationId: claim.organizationId,
          status: 'PROCESSING',
          leaseOwner: claim.leaseOwner,
          leaseUntil: { gt: now },
        },
      });
      if (!event) return null;

      const existing = await tx.extractionAttempt.findUnique({
        where: { outboxId: event.id },
      });
      const billImport = await tx.energyBillImport.findFirst({
        where: { id: event.importId, organizationId: event.organizationId },
        include: {
          documentVersion: {
            select: {
              persistenceState: true,
              fileSize: true,
              verifiedMime: true,
              storedObject: {
                select: {
                  backend: true,
                  bucket: true,
                  key: true,
                  sha256: true,
                  verified: true,
                  scanResult: true,
                },
              },
            },
          },
        },
      });
      if (!billImport) {
        await tx.importOutbox.update({
          where: { id: event.id },
          data: {
            status: 'FAILED',
            leaseOwner: null,
            leaseUntil: null,
            lastErrorCode: 'IMPORT_CONTEXT_MISSING',
            updatedAt: now,
          },
        });
        return null;
      }

      const documentRef = {
        backend: billImport.documentVersion.storedObject?.backend ?? '',
        bucket: billImport.documentVersion.storedObject?.bucket ?? '',
        key: billImport.documentVersion.storedObject?.key ?? '',
        sha256: billImport.documentVersion.storedObject?.sha256 ?? '',
        mimeType: billImport.documentVersion.verifiedMime ?? '',
        byteSize: billImport.documentVersion.fileSize,
      };

      if (existing) {
        if (
          existing.status === 'SUBMITTING' &&
          existing.externalOperationId === null &&
          existing.leaseOwner !== claim.leaseOwner
        ) {
          const unknown = await tx.extractionAttempt.update({
            where: { id: existing.id },
            data: {
              status: 'UNKNOWN',
              errorCode: 'SUBMISSION_RESULT_UNKNOWN',
              retryable: false,
              finishedAt: now,
              leaseOwner: claim.leaseOwner,
              leaseUntil: claim.leaseUntil,
              heartbeatAt: now,
            },
          });
          await tx.energyBillImport.updateMany({
            where: {
              id: billImport.id,
              status: 'QUEUED',
              version: billImport.version,
            },
            data: { status: 'FAILED', version: { increment: 1 } },
          });
          await tx.importOutbox.updateMany({
            where: {
              id: event.id,
              status: 'PROCESSING',
              leaseOwner: claim.leaseOwner,
            },
            data: {
              status: 'FAILED',
              leaseOwner: null,
              leaseUntil: null,
              lastErrorCode: 'SUBMISSION_RESULT_UNKNOWN',
              updatedAt: now,
            },
          });
          await tx.auditEvent.create({
            data: {
              organizationId: event.organizationId,
              action: 'ENERGY_BILL_IMPORT_SUBMISSION_UNKNOWN',
              entityId: event.importId,
              traceId: existing.correlationId,
            },
          });
          return toPrepared(unknown, documentRef);
        }
        const resumed = await tx.extractionAttempt.update({
          where: { id: existing.id },
          data: {
            leaseOwner: claim.leaseOwner,
            leaseUntil: claim.leaseUntil,
            heartbeatAt: now,
          },
        });
        return toPrepared(resumed, documentRef);
      }

      if (
        billImport.status !== 'QUEUED' ||
        billImport.documentVersion.persistenceState !== 'READY' ||
        !billImport.documentVersion.storedObject?.verified ||
        billImport.documentVersion.storedObject.scanResult !== 'CLEAN' ||
        !documentRef.backend ||
        !documentRef.bucket ||
        !documentRef.key ||
        !documentRef.mimeType
      ) {
        const canceled = billImport.status === 'CANCELED';
        await tx.importOutbox.update({
          where: { id: event.id },
          data: {
            status: canceled ? 'CANCELED' : 'FAILED',
            leaseOwner: null,
            leaseUntil: null,
            lastErrorCode: canceled ? null : 'IMPORT_NOT_PROCESSABLE',
            updatedAt: now,
          },
        });
        return null;
      }

      const attemptNumber =
        (await tx.extractionAttempt.count({ where: { importId: event.importId } })) + 1;
      const attempt = await tx.extractionAttempt.create({
        data: {
          organizationId: event.organizationId,
          importId: event.importId,
          outboxId: event.id,
          attemptNumber,
          correlationId: randomUUID(),
          status: 'CLAIMED',
          leaseOwner: claim.leaseOwner,
          leaseUntil: claim.leaseUntil,
          heartbeatAt: now,
        },
      });
      return toPrepared(attempt, documentRef);
    },
    { isolationLevel: 'Serializable' },
  );
}

export async function markImportSubmissionStarted(
  prisma: PrismaClient,
  claim: ImportOutboxClaim,
  attemptId: string,
  now: Date,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const activeLease = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM import_outbox
      WHERE id = ${claim.id}::uuid
        AND status = 'PROCESSING'
        AND lease_owner = ${claim.leaseOwner}
        AND lease_until > ${now}
      FOR UPDATE
    `;
    if (!activeLease.length) return false;
    const result = await tx.extractionAttempt.updateMany({
      where: {
        id: attemptId,
        outboxId: claim.id,
        status: 'CLAIMED',
        leaseOwner: claim.leaseOwner,
      },
      data: { status: 'SUBMITTING', heartbeatAt: now },
    });
    return result.count === 1;
  });
}

export async function recordImportOperationId(
  prisma: PrismaClient,
  claim: ImportOutboxClaim,
  attemptId: string,
  operationId: string,
  now: Date,
): Promise<boolean> {
  if (!operationId.trim() || operationId.length > 500)
    throw new Error('Invalid external operation identity');
  return prisma.$transaction(async (tx) => {
    const activeLease = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM import_outbox
      WHERE id = ${claim.id}::uuid
        AND status = 'PROCESSING'
        AND lease_owner = ${claim.leaseOwner}
        AND lease_until > ${now}
      FOR UPDATE
    `;
    if (!activeLease.length) return false;
    const result = await tx.extractionAttempt.updateMany({
      where: {
        id: attemptId,
        outboxId: claim.id,
        status: 'SUBMITTING',
        externalOperationId: null,
        leaseOwner: claim.leaseOwner,
      },
      data: {
        status: 'SUBMITTED',
        externalOperationId: operationId,
        heartbeatAt: now,
      },
    });
    return result.count === 1;
  });
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

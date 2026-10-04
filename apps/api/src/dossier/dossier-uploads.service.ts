import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type DossierDocumentVersion } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../proposal/storage.service';
import { fail, hash } from '../identity/security';
import { documentScope, organizationGrant, sensitiveCategories } from './dossier-policy';
import { ContentValidatorService, decodeDocumentBase64 } from './content-validator.service';
import { ScannerService } from './scanner.service';
import {
  type Actor,
  CreateDocumentUploadDto,
  CreateDocumentVersionDto,
  CompleteUploadDto,
  ArchiveDocumentDto,
  CustomerRepresentativeDto,
  type DossierDocumentViewDto,
} from './dossier.dto';

const include = {
  versions: { orderBy: { versionNumber: 'desc' as const } },
  utilityUnitLinks: true,
  opportunityLinks: true,
  projectLinks: true,
  representativeLinks: true,
  contractLinks: true,
  workOrderLinks: true,
} satisfies Prisma.DossierDocumentInclude;
type Document = Prisma.DossierDocumentGetPayload<{ include: typeof include }>;
type Tx = Prisma.TransactionClient;

@Injectable()
export class DossierUploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly scanner: ScannerService,
    private readonly content: ContentValidatorService,
    private readonly config: ConfigService,
  ) {}

  private validateFile(
    base64: string,
    mime: string,
    expectedSize: number,
    expectedHash?: string,
  ): Buffer {
    const buffer = decodeDocumentBase64(base64);
    if (buffer.length !== expectedSize)
      fail('FILE_SIZE_MISMATCH', 'Tamanho do arquivo não corresponde ao informado.', 422);
    if (
      !['application/pdf', 'image/jpeg', 'image/png'].includes(mime) ||
      !this.storage.validateMagicBytes(buffer, mime)
    )
      fail(
        'FILE_TYPE_INVALID',
        'Conteúdo não corresponde ao formato declarado (magic bytes inválidos).',
        415,
      );
    if (
      expectedHash &&
      expectedHash !== 'pending' &&
      expectedHash !== this.storage.computeHash(buffer)
    )
      fail('FILE_HASH_MISMATCH', 'Hash do arquivo não corresponde ao informado.', 422);
    // Reject active/encrypted PDF content; malware scanning remains mandatory.
    if (mime === 'application/pdf') {
      const text = buffer.toString('latin1');
      if (
        !text.includes('%%EOF') ||
        text.slice(text.lastIndexOf('%%EOF') + 5).trim() ||
        /\/(?:JavaScript|JS|Launch|EmbeddedFile|Encrypt)\b/.test(text)
      )
        fail('PDF_UNSAFE', 'PDF corrompido, protegido ou com conteúdo ativo não é permitido.', 422);
      if ((text.match(/\/Type\s*\/Page\b/g) ?? []).length > 50)
        fail('PDF_PAGE_LIMIT', 'PDF excede 50 páginas.', 422);
    }
    return buffer;
  }

  private async transaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(work, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 60_000,
          maxWait: 10_000,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < 3
        )
          continue;
        throw error;
      }
    }
  }

  private async lock(tx: Tx, key: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
  }

  private async command<T extends Prisma.InputJsonValue>(
    actor: Actor,
    operation: string,
    key: string | undefined,
    payload: unknown,
    work: (tx: Tx) => Promise<T>,
  ): Promise<T> {
    if (!key || !/^[a-zA-Z0-9_-]{8,100}$/.test(key))
      fail('IDEMPOTENCY_KEY_REQUIRED', 'Informe uma chave de idempotência válida.', 400);
    const scoped = `${actor.organizationId}:${actor.userId}:${operation}:${key}`;
    const canonical = (value: unknown): unknown =>
      Array.isArray(value)
        ? value.map(canonical)
        : value && typeof value === 'object'
          ? Object.fromEntries(
              Object.entries(value)
                .filter(([, v]) => v !== undefined)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => [k, canonical(v)]),
            )
          : value;
    const fingerprint = hash(JSON.stringify(canonical(payload)));
    return this.transaction(async (tx) => {
      await this.lock(tx, scoped);
      const existing = await tx.dossierCommand.findUnique({ where: { key: scoped } });
      if (existing) {
        if (existing.fingerprint !== fingerprint)
          fail('IDEMPOTENCY_KEY_REUSED', 'A chave já foi usada com outro conteúdo.', 409);
        return existing.result as T;
      }
      const result = await work(tx);
      await tx.dossierCommand.create({
        data: {
          key: scoped,
          organizationId: actor.organizationId,
          actorId: actor.userId,
          fingerprint,
          result,
        },
      });
      return result;
    });
  }

  private audit(tx: Tx, actor: Actor, action: string, entityId: string) {
    return tx.auditEvent.create({
      data: {
        organizationId: actor.organizationId,
        actorId: actor.userId,
        action,
        entityId,
        traceId: randomUUID(),
      },
    });
  }

  private async validateContext(
    tx: Tx,
    actor: Actor,
    customerId: string,
    dto: CreateDocumentUploadDto,
  ) {
    const org = actor.organizationId;
    if (!(await tx.customer.findFirst({ where: { id: customerId, organizationId: org } })))
      fail('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.', 404);
    if (
      sensitiveCategories.includes(dto.category) &&
      !organizationGrant(actor, 'documents:identity_read')
    )
      fail('ACCESS_DENIED', 'Categoria exige autorização adicional.', 403);
    const targets: [string, Promise<unknown>][] = [];
    if (dto.utilityUnitId)
      targets.push([
        'Unidade consumidora',
        tx.utilityUnit.findFirst({
          where: { id: dto.utilityUnitId, customerId, organizationId: org },
        }),
      ]);
    if (dto.opportunityId)
      targets.push([
        'Oportunidade',
        tx.opportunity.findFirst({
          where: {
            id: dto.opportunityId,
            customerId,
            organizationId: org,
            ...(dto.utilityUnitId ? { utilityUnitId: dto.utilityUnitId } : {}),
          },
        }),
      ]);
    if (dto.projectId)
      targets.push([
        'Projeto',
        tx.operationalProject.findFirst({
          where: {
            id: dto.projectId,
            organizationId: org,
            opportunity: {
              customerId,
              organizationId: org,
              ...(dto.opportunityId ? { id: dto.opportunityId } : {}),
              ...(dto.utilityUnitId ? { utilityUnitId: dto.utilityUnitId } : {}),
            },
          },
        }),
      ]);
    if (dto.contractId)
      targets.push([
        'Contrato',
        tx.contract.findFirst({
          where: {
            id: dto.contractId,
            organizationId: org,
            opportunity: {
              customerId,
              organizationId: org,
              ...(dto.opportunityId ? { id: dto.opportunityId } : {}),
              ...(dto.utilityUnitId ? { utilityUnitId: dto.utilityUnitId } : {}),
            },
          },
        }),
      ]);
    if (dto.workOrderId)
      targets.push([
        'Ordem de serviço',
        tx.workOrder.findFirst({
          where: {
            id: dto.workOrderId,
            organizationId: org,
            ...(dto.projectId ? { projectId: dto.projectId } : {}),
            project: {
              organizationId: org,
              opportunity: {
                customerId,
                organizationId: org,
                ...(dto.opportunityId ? { id: dto.opportunityId } : {}),
                ...(dto.utilityUnitId ? { utilityUnitId: dto.utilityUnitId } : {}),
              },
            },
          },
        }),
      ]);
    if (dto.representativeId)
      targets.push([
        'Representante',
        tx.customerRepresentative.findFirst({
          where: { id: dto.representativeId, customerId, organizationId: org },
        }),
      ]);
    for (const [label, query] of targets)
      if (!(await query))
        fail(
          'DOCUMENT_CONTEXT_INVALID',
          `${label} não pertence ao cliente/contexto informado.`,
          422,
        );
  }

  private async links(tx: Tx, documentId: string, dto: CreateDocumentUploadDto) {
    if (dto.utilityUnitId)
      await tx.documentUtilityUnitLink.create({
        data: { documentId, utilityUnitId: dto.utilityUnitId },
      });
    if (dto.opportunityId)
      await tx.documentOpportunityLink.create({
        data: { documentId, opportunityId: dto.opportunityId },
      });
    if (dto.projectId)
      await tx.documentProjectLink.create({ data: { documentId, projectId: dto.projectId } });
    if (dto.representativeId)
      await tx.documentRepresentativeLink.create({
        data: { documentId, representativeId: dto.representativeId },
      });
    if (dto.contractId)
      await tx.documentContractLink.create({ data: { documentId, contractId: dto.contractId } });
    if (dto.workOrderId)
      await tx.documentWorkOrderLink.create({
        data: { documentId, workOrderId: dto.workOrderId, phase: dto.phase },
      });
  }

  private async snapshot(tx: Tx, actor: Actor, version: DossierDocumentVersion, sha256: string) {
    const stored = await tx.storedObject.create({
      data: {
        organizationId: actor.organizationId,
        backend: this.config.get<string>('S3_BACKEND') === 'S3' ? 'S3' : 'MINIO',
        bucket: this.config.getOrThrow<string>('S3_BUCKET'),
        key: `dossier/${actor.organizationId}/${version.id}/${sha256}`,
        sha256,
        byteSize: version.fileSize,
        scanResult: 'UNCHECKED',
      },
    });
    await tx.dossierDocumentVersion.update({
      where: { id: version.id },
      data: { storedObjectId: stored.id, sha256 },
    });
  }

  private async accessible(tx: Tx, actor: Actor, id: string, permission = 'documents:upload') {
    const doc = await tx.dossierDocument.findFirst({
      where: { id, AND: [documentScope(actor, permission)] },
      include,
    });
    if (!doc) fail('DOCUMENT_NOT_FOUND', 'Documento não encontrado no seu contexto.', 404);
    return doc;
  }

  async createUpload(
    actor: Actor,
    customerId: string,
    dto: CreateDocumentUploadDto,
    key?: string,
  ): Promise<DossierDocumentViewDto> {
    documentScope(actor, 'documents:upload');
    const buffer = dto.fileBase64
      ? this.validateFile(dto.fileBase64, dto.declaredMime, dto.fileSize, dto.sha256)
      : undefined;
    const ids = await this.command(actor, `upload:${customerId}`, key, dto, async (tx) => {
      await this.validateContext(tx, actor, customerId, dto);
      const doc = await tx.dossierDocument.create({
        data: {
          organizationId: actor.organizationId,
          customerId,
          category: dto.category,
          title: dto.title,
          purpose: dto.purpose,
          createdBy: actor.userId,
          versions: {
            create: {
              versionNumber: 1,
              originalName: this.storage.sanitizeFileName(dto.fileName),
              fileSize: dto.fileSize,
              declaredMime: dto.declaredMime,
              sha256: buffer ? this.storage.computeHash(buffer) : (dto.sha256 ?? 'pending'),
              authorId: actor.userId,
            },
          },
        },
        include: { versions: true },
      });
      await this.links(tx, doc.id, dto);
      await this.accessible(tx, actor, doc.id);
      const version = doc.versions[0]!;
      if (buffer) await this.snapshot(tx, actor, version, this.storage.computeHash(buffer));
      await this.audit(tx, actor, 'document.upload_intended', doc.id);
      return { documentId: doc.id, versionId: version.id };
    });
    // Revalidate authorization even on replay; intent survives S3 or API failure.
    await this.prisma.$transaction((tx) => this.accessible(tx, actor, ids.documentId));
    return buffer
      ? this.process(actor, ids.documentId, ids.versionId, buffer)
      : this.view(
          await this.prisma.$transaction((tx) => this.accessible(tx, actor, ids.documentId)),
        );
  }

  async completeUpload(actor: Actor, versionId: string, dto: CompleteUploadDto, key?: string) {
    const version = await this.prisma.dossierDocumentVersion.findFirst({
      where: { id: versionId, document: documentScope(actor, 'documents:upload') },
    });
    if (!version) fail('DOCUMENT_NOT_FOUND', 'Versão não encontrada.', 404);
    if (dto.expectedVersion !== version.versionNumber)
      fail('CONCURRENT_MODIFICATION', 'Versão esperada não corresponde ao documento.', 409);
    const buffer = dto.fileBase64
      ? this.validateFile(dto.fileBase64, version.declaredMime, version.fileSize, version.sha256)
      : undefined;
    await this.command(actor, `complete:${versionId}`, key, dto, async (tx) => {
      await this.lock(tx, versionId);
      await this.accessible(tx, actor, version.documentId);
      const current = await tx.dossierDocumentVersion.findUniqueOrThrow({
        where: { id: versionId },
      });
      if (current.persistenceState === 'CANCELED' || current.persistenceState === 'REJECTED')
        fail('DOCUMENT_STATE_INVALID', 'Esta intenção não pode ser concluída.', 409);
      if (
        buffer &&
        current.sha256 !== 'pending' &&
        this.storage.computeHash(buffer) !== current.sha256
      )
        fail('CONCURRENT_MODIFICATION', 'Outro conteúdo já foi fixado para esta intenção.', 409);
      if (buffer && !current.storedObjectId)
        await this.snapshot(tx, actor, current, this.storage.computeHash(buffer));
      return { documentId: version.documentId, versionId };
    });
    return this.process(actor, version.documentId, versionId, buffer);
  }

  private async process(
    actor: Actor,
    documentId: string,
    versionId: string,
    buffer?: Buffer,
    verifyExisting = false,
  ) {
    const result = await this.transaction(async (tx) => {
      await this.lock(tx, versionId);
      const doc = await this.accessible(tx, actor, documentId);
      const version = await tx.dossierDocumentVersion.findUniqueOrThrow({
        where: { id: versionId },
        include: { storedObject: true },
      });
      if (version.persistenceState === 'READY' && !verifyExisting)
        return { view: this.view(doc, version), unavailable: false };
      if (
        (!verifyExisting && doc.status !== 'ACTIVE') ||
        ['CANCELED', 'REJECTED'].includes(version.persistenceState)
      )
        fail('DOCUMENT_STATE_INVALID', 'Documento não aceita conclusão nesta situação.', 409);
      if (!version.storedObject)
        fail('UPLOAD_CONTENT_REQUIRED', 'Envie o arquivo para concluir esta intenção.', 422);
      const object = version.storedObject;
      let bytes: Buffer;
      try {
        if (buffer && object.backend !== 'LEGACY_LOCAL')
          await this.storage.upload(object.bucket, object.key, buffer, version.declaredMime);
        bytes =
          object.backend === 'LEGACY_LOCAL' && buffer
            ? buffer
            : await this.storage.download(object.bucket, object.key, object.backend);
      } catch {
        const failed = await tx.dossierDocumentVersion.update({
          where: { id: versionId },
          data: {
            persistenceState: version.persistenceState === 'READY' ? 'MISSING' : 'UPLOAD_FAILED',
          },
        });
        await this.audit(tx, actor, 'document.storage_failed', documentId);
        return { view: this.view(doc, failed), unavailable: true };
      }
      if (bytes.length !== version.fileSize || this.storage.computeHash(bytes) !== version.sha256) {
        const failed = await tx.dossierDocumentVersion.update({
          where: { id: versionId },
          data: { persistenceState: 'QUARANTINED' },
        });
        await this.audit(tx, actor, 'document.integrity_failed', documentId);
        return { view: this.view(doc, failed), unavailable: false };
      }
      try {
        this.validateFile(
          bytes.toString('base64'),
          version.declaredMime,
          version.fileSize,
          version.sha256,
        );
      } catch {
        const rejected = await tx.dossierDocumentVersion.update({
          where: { id: versionId },
          data: { persistenceState: 'REJECTED' },
        });
        await this.audit(tx, actor, 'document.rejected', documentId);
        return { view: this.view(doc, rejected), unavailable: false };
      }
      try {
        await this.content.validate(bytes, version.declaredMime);
      } catch {
        const rejected = await tx.dossierDocumentVersion.update({
          where: { id: versionId },
          data: { persistenceState: 'REJECTED' },
        });
        await this.audit(tx, actor, 'document.content_rejected', documentId);
        return { view: this.view(doc, rejected), unavailable: false };
      }
      let scan: Awaited<ReturnType<ScannerService['scan']>>;
      try {
        scan = await this.scanner.scan(bytes);
      } catch {
        const quarantined = await tx.dossierDocumentVersion.update({
          where: { id: versionId },
          data: { persistenceState: 'QUARANTINED' },
        });
        await this.audit(tx, actor, 'document.scanner_unavailable', documentId);
        return { view: this.view(doc, quarantined), unavailable: false };
      }
      let verifiedObjectId = object.id;
      if (object.backend === 'LEGACY_LOCAL' && scan.result === 'CLEAN') {
        const destination = await this.storage.upload(
          this.config.getOrThrow<string>('S3_BUCKET'),
          `dossier/${actor.organizationId}/${version.id}/${version.sha256}`,
          bytes,
          version.declaredMime,
        );
        const migrated = await tx.storedObject.create({
          data: {
            organizationId: actor.organizationId,
            ...destination,
            verified: true,
            scanResult: scan.result,
            scannerVersion: scan.version,
          },
        });
        verifiedObjectId = migrated.id;
        await this.audit(tx, actor, 'document.legacy_migrated', documentId);
      }
      await tx.storedObject.update({
        where: { id: verifiedObjectId },
        data: {
          verified: scan.result === 'CLEAN',
          scanResult: scan.result,
          scannerVersion: scan.version,
        },
      });
      const updated = await tx.dossierDocumentVersion.update({
        where: { id: versionId },
        data: {
          storedObjectId: verifiedObjectId,
          persistenceState: scan.result === 'CLEAN' ? 'READY' : 'REJECTED',
          verifiedMime: scan.result === 'CLEAN' ? version.declaredMime : version.verifiedMime,
        },
      });
      await this.audit(
        tx,
        actor,
        scan.result === 'CLEAN' ? 'document.ready' : 'document.rejected',
        documentId,
      );
      return { view: this.view(doc, updated), unavailable: false };
    });
    if (result.unavailable)
      fail(
        'STORAGE_UNAVAILABLE',
        'Armazenamento indisponível. Reenvie com a mesma chave ou conclua a intenção existente.',
        503,
        { documentId, versionId },
      );
    return result.view;
  }

  async replace(actor: Actor, documentId: string, dto: CreateDocumentVersionDto, key?: string) {
    const doc = await this.prisma.$transaction((tx) => this.accessible(tx, actor, documentId));
    if (
      dto.category !== doc.category ||
      dto.title !== doc.title ||
      dto.utilityUnitId ||
      dto.opportunityId ||
      dto.projectId ||
      dto.contractId ||
      dto.representativeId ||
      dto.workOrderId
    )
      fail(
        'DOCUMENT_CONTEXT_INVALID',
        'Substituição preserva título, categoria e vínculos do documento.',
        422,
      );
    const buffer = dto.fileBase64
      ? this.validateFile(dto.fileBase64, dto.declaredMime, dto.fileSize, dto.sha256)
      : undefined;
    const ids = await this.command(actor, `replace:${documentId}`, key, dto, async (tx) => {
      await this.lock(tx, documentId);
      const current = await this.accessible(tx, actor, documentId);
      if (current.status !== 'ACTIVE' || current.metadataVersion !== dto.expectedVersion)
        fail(
          'CONCURRENT_MODIFICATION',
          'Documento foi alterado ou arquivado. Atualize a lista.',
          409,
        );
      const next = await tx.dossierDocumentVersion.create({
        data: {
          documentId,
          versionNumber: (current.versions[0]?.versionNumber ?? 0) + 1,
          originalName: this.storage.sanitizeFileName(dto.fileName),
          fileSize: dto.fileSize,
          declaredMime: dto.declaredMime,
          sha256: buffer ? this.storage.computeHash(buffer) : (dto.sha256 ?? 'pending'),
          authorId: actor.userId,
        },
      });
      await tx.dossierDocument.update({
        where: { id: documentId },
        data: { metadataVersion: { increment: 1 } },
      });
      if (buffer) await this.snapshot(tx, actor, next, this.storage.computeHash(buffer));
      await this.audit(tx, actor, 'document.replacement_intended', documentId);
      return { documentId, versionId: next.id };
    });
    return buffer
      ? this.process(actor, documentId, ids.versionId, buffer)
      : this.view(await this.prisma.$transaction((tx) => this.accessible(tx, actor, documentId)));
  }

  async cancel(actor: Actor, versionId: string, dto: CompleteUploadDto, key?: string) {
    const version = await this.prisma.dossierDocumentVersion.findFirst({
      where: { id: versionId, document: documentScope(actor, 'documents:upload') },
    });
    if (!version) fail('DOCUMENT_NOT_FOUND', 'Versão não encontrada.', 404);
    return this.command(actor, `cancel:${versionId}`, key, dto, async (tx) => {
      await this.lock(tx, versionId);
      await this.accessible(tx, actor, version.documentId);
      const changed = await tx.dossierDocumentVersion.updateMany({
        where: {
          id: versionId,
          versionNumber: dto.expectedVersion,
          persistenceState: { in: ['PENDING_UPLOAD', 'QUARANTINED', 'UPLOAD_FAILED'] },
        },
        data: { persistenceState: 'CANCELED' },
      });
      if (!changed.count)
        fail('CONCURRENT_MODIFICATION', 'Intenção alterada ou já concluída.', 409);
      await this.audit(tx, actor, 'document.upload_canceled', version.documentId);
      return { success: true };
    });
  }

  async archiveDocument(actor: Actor, documentId: string, dto: ArchiveDocumentDto, key?: string) {
    await this.prisma.$transaction((tx) => this.accessible(tx, actor, documentId));
    return this.command(actor, `archive:${documentId}`, key, dto, async (tx) => {
      const doc = await this.accessible(tx, actor, documentId);
      if (doc.metadataVersion !== dto.expectedVersion)
        fail('CONCURRENT_MODIFICATION', 'Documento foi alterado. Atualize a lista.', 409);
      const changed = await tx.dossierDocument.updateMany({
        where: { id: documentId, metadataVersion: dto.expectedVersion, status: 'ACTIVE' },
        data: { status: 'ARCHIVED', archiveReason: dto.reason, metadataVersion: { increment: 1 } },
      });
      if (!changed.count)
        fail('CONCURRENT_MODIFICATION', 'Documento já foi alterado ou arquivado.', 409);
      await this.audit(tx, actor, 'document.archived', documentId);
      return { success: true };
    });
  }

  async createRepresentative(
    actor: Actor,
    customerId: string,
    dto: CustomerRepresentativeDto,
    key?: string,
  ) {
    if (
      !organizationGrant(actor, 'documents:identity_read') ||
      !organizationGrant(actor, 'documents:upload')
    )
      fail('ACCESS_DENIED', 'Você não tem permissão para cadastrar representantes.', 403);
    const ids = await this.command(actor, `representative:${customerId}`, key, dto, async (tx) => {
      if (
        !(await tx.customer.findFirst({
          where: { id: customerId, organizationId: actor.organizationId },
        }))
      )
        fail('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.', 404);
      const rep = await tx.customerRepresentative.create({
        data: { ...dto, customerId, organizationId: actor.organizationId },
      });
      await this.audit(tx, actor, 'document.representative_created', rep.id);
      return { id: rep.id };
    });
    const rep = await this.prisma.customerRepresentative.findFirstOrThrow({
      where: { id: ids.id, customerId, organizationId: actor.organizationId },
    });
    return {
      ...rep,
      createdAt: rep.createdAt.toISOString(),
      updatedAt: rep.updatedAt.toISOString(),
    };
  }

  async reconcile(actor: Actor, versionId: string, key?: string) {
    const version = await this.prisma.dossierDocumentVersion.findFirst({
      where: { id: versionId, document: documentScope(actor, 'documents:upload') },
    });
    if (!version) fail('DOCUMENT_NOT_FOUND', 'Versão não encontrada.', 404);
    await this.command(actor, `reconcile:${versionId}`, key, { versionId }, async (tx) => {
      await this.accessible(tx, actor, version.documentId);
      return { versionId };
    });
    return this.process(actor, version.documentId, versionId, undefined, true);
  }

  private view(doc: Document, version = doc.versions[0]): DossierDocumentViewDto {
    return {
      id: doc.id,
      metadataVersion: doc.metadataVersion,
      origin: 'DOSSIER',
      category: doc.category,
      title: doc.title,
      status: doc.status,
      purpose: doc.purpose,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      createdBy: doc.createdBy,
      contentUrl:
        version?.persistenceState === 'READY'
          ? `/api/v1/documents/${doc.id}/versions/${version.id}/content`
          : undefined,
      currentVersion: version
        ? {
            id: version.id,
            versionNumber: version.versionNumber,
            originalName: version.originalName,
            fileSize: version.fileSize,
            declaredMime: version.declaredMime,
            verifiedMime: version.verifiedMime,
            sha256: version.sha256,
            persistenceState: version.persistenceState,
            createdAt: version.createdAt.toISOString(),
          }
        : null,
      links: {
        utilityUnitIds: doc.utilityUnitLinks.map((l) => l.utilityUnitId),
        opportunityIds: doc.opportunityLinks.map((l) => l.opportunityId),
        projectIds: doc.projectLinks.map((l) => l.projectId),
        representativeIds: doc.representativeLinks.map((l) => l.representativeId),
        contractIds: doc.contractLinks.map((l) => l.contractId),
      },
    };
  }
}

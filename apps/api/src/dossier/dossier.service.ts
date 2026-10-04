import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  customerScope,
  documentScope,
  organizationGrant,
  photoCategories,
  sensitiveCategories,
} from './dossier-policy';
import { fail } from '../identity/security';
import { StorageService } from '../proposal/storage.service';
import {
  type Actor,
  DossierDocumentViewDto,
  DossierHistoryViewDto,
  DossierUploadContextDto,
  DOSSIER_CATEGORIES,
  RepresentativeViewDto,
} from './dossier.dto';

@Injectable()
export class DossierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async listCustomerDocuments(
    actor: Actor,
    customerId: string,
    filters?: {
      category?: string;
      status?: string;
      utilityUnitId?: string;
      opportunityId?: string;
      projectId?: string;
      from?: string;
      to?: string;
    },
  ): Promise<DossierDocumentViewDto[]> {
    for (const id of [filters?.utilityUnitId, filters?.opportunityId, filters?.projectId]) {
      if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
        fail('INVALID_FILTER', 'Identificador de filtro inválido.');
    }
    for (const date of [filters?.from, filters?.to])
      if (date && !Number.isFinite(Date.parse(date)))
        fail('INVALID_FILTER', 'Data de filtro inválida.');
    if (filters?.from && filters?.to && new Date(filters.from) > new Date(filters.to))
      fail('INVALID_FILTER', 'Data inicial deve preceder a final.');
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, AND: [customerScope(actor, 'documents:read')] },
    });
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado na organização.');
    }

    // 1. Fetch Dossier documents
    const dossierDocs = await this.prisma.dossierDocument.findMany({
      where: {
        AND: [documentScope(actor, 'documents:read')],
        organizationId: actor.organizationId,
        customerId,
        ...(filters?.category ? { category: filters.category } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.utilityUnitId
          ? { utilityUnitLinks: { some: { utilityUnitId: filters.utilityUnitId } } }
          : {}),
        ...(filters?.opportunityId
          ? { opportunityLinks: { some: { opportunityId: filters.opportunityId } } }
          : {}),
        ...(filters?.projectId ? { projectLinks: { some: { projectId: filters.projectId } } } : {}),
        ...(filters?.from || filters?.to
          ? {
              createdAt: {
                ...(filters?.from ? { gte: new Date(filters.from) } : {}),
                ...(filters?.to ? { lte: new Date(filters.to) } : {}),
              },
            }
          : {}),
      },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
        utilityUnitLinks: true,
        opportunityLinks: true,
        projectLinks: true,
        representativeLinks: true,
        contractLinks: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const items: DossierDocumentViewDto[] = dossierDocs.map((doc) => {
      const current = doc.versions[0];
      return {
        metadataVersion: doc.metadataVersion,
        contentUrl:
          current?.persistenceState === 'READY'
            ? `/api/v1/documents/${doc.id}/versions/${current.id}/content`
            : undefined,
        id: doc.id,
        origin: 'DOSSIER',
        category: doc.category,
        title: doc.title,
        status: doc.status,
        purpose: doc.purpose,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        createdBy: doc.createdBy,
        currentVersion: current
          ? {
              id: current.id,
              versionNumber: current.versionNumber,
              originalName: current.originalName,
              fileSize: current.fileSize,
              declaredMime: current.declaredMime,
              verifiedMime: current.verifiedMime,
              sha256: current.sha256,
              persistenceState: current.persistenceState,
              createdAt: current.createdAt.toISOString(),
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
    });

    // 2. Consolidate with Proposal Documents (DOC-03)
    if (
      organizationGrant(actor, 'proposals:read') &&
      (!filters?.category || filters.category === 'COMMERCIAL_PROPOSAL')
    ) {
      const opps = await this.prisma.opportunity.findMany({
        where: {
          customerId,
          organizationId: actor.organizationId,
          ...(filters?.opportunityId ? { id: filters.opportunityId } : {}),
          ...(filters?.utilityUnitId ? { utilityUnitId: filters.utilityUnitId } : {}),
          ...(filters?.projectId ? { operationalProject: { id: filters.projectId } } : {}),
        },
        select: { id: true },
      });
      const oppIds = opps.map((o) => o.id);
      if (oppIds.length > 0) {
        const proposalDocs = await this.prisma.proposalDocument.findMany({
          where: {
            organizationId: actor.organizationId,
            proposalVersion: {
              proposal: {
                opportunityId: { in: oppIds },
              },
            },
          },
          include: {
            proposalVersion: {
              include: { proposal: true },
            },
          },
          orderBy: { generatedAt: 'desc' },
        });

        for (const pDoc of proposalDocs) {
          items.push({
            metadataVersion: 1,
            contentUrl: organizationGrant(actor, 'proposals:download')
              ? `/api/v1/dossier/proposal-documents/${pDoc.id}/content`
              : undefined,
            id: pDoc.id,
            origin: 'PROPOSAL_DOCUMENT',
            category: 'COMMERCIAL_PROPOSAL',
            title: `Proposta Técnica e Comercial (${pDoc.fileName})`,
            status: 'ACTIVE',
            purpose: 'Apresentação comercial e dimensionamento',
            createdAt: pDoc.generatedAt.toISOString(),
            updatedAt: pDoc.generatedAt.toISOString(),
            createdBy: 'Sistema Moura Solar',
            currentVersion: {
              id: pDoc.id,
              versionNumber: pDoc.proposalVersion.versionNumber,
              originalName: pDoc.fileName,
              fileSize: pDoc.fileSize,
              declaredMime: pDoc.mimeType,
              verifiedMime: pDoc.mimeType,
              sha256: pDoc.contentHash,
              persistenceState: pDoc.generationStatus === 'READY' ? 'READY' : 'PENDING_UPLOAD',
              createdAt: pDoc.generatedAt.toISOString(),
            },
            links: {
              utilityUnitIds: [],
              opportunityIds: [pDoc.proposalVersion.proposal.opportunityId],
              projectIds: [],
              representativeIds: [],
              contractIds: [],
            },
          });
        }
      }
    }

    // 3. Consolidate with Contract Documents (DOC-03)
    if (
      organizationGrant(actor, 'contracts:read') &&
      (!filters?.category || filters.category === 'CONTRACT_ANNEX')
    ) {
      const contractDocs = await this.prisma.contractDocument.findMany({
        where: {
          organizationId: actor.organizationId,
          contractVersion: {
            contract: {
              opportunity: {
                customerId,
                organizationId: actor.organizationId,
                ...(filters?.opportunityId ? { id: filters.opportunityId } : {}),
                ...(filters?.utilityUnitId ? { utilityUnitId: filters.utilityUnitId } : {}),
                ...(filters?.projectId ? { operationalProject: { id: filters.projectId } } : {}),
              },
            },
          },
        },
        include: {
          contractVersion: {
            include: {
              contract: true,
            },
          },
        },
        orderBy: { generatedAt: 'desc' },
      });

      for (const cDoc of contractDocs) {
        items.push({
          metadataVersion: 1,
          contentUrl: organizationGrant(actor, 'contracts:download')
            ? `/api/v1/dossier/contract-documents/${cDoc.id}/content`
            : undefined,
          id: cDoc.id,
          origin: 'CONTRACT_DOCUMENT',
          category: 'CONTRACT_ANNEX',
          title: `Contrato Formal Moura Solar (${cDoc.type})`,
          status: 'ACTIVE',
          purpose: 'Instrumento contratual vinculante',
          createdAt: cDoc.generatedAt.toISOString(),
          updatedAt: cDoc.generatedAt.toISOString(),
          createdBy: 'Sistema Moura Solar',
          currentVersion: {
            id: cDoc.id,
            versionNumber: cDoc.contractVersion.versionNumber,
            originalName: cDoc.fileName,
            fileSize: cDoc.fileSize,
            declaredMime: cDoc.mimeType,
            verifiedMime: cDoc.mimeType,
            sha256: cDoc.contentHash,
            persistenceState: cDoc.generationStatus === 'READY' ? 'READY' : 'PENDING_UPLOAD',
            createdAt: cDoc.generatedAt.toISOString(),
          },
          links: {
            utilityUnitIds: [],
            opportunityIds: [cDoc.contractVersion.contract.opportunityId],
            projectIds: [],
            representativeIds: [],
            contractIds: [cDoc.contractVersion.contractId],
          },
        });
      }
    }

    // Sort consolidated items by creation date
    return items
      .filter(
        (item) =>
          (!filters?.status || item.status === filters.status) &&
          (!filters?.from || new Date(item.createdAt) >= new Date(filters.from)) &&
          (!filters?.to || new Date(item.createdAt) <= new Date(filters.to)),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async downloadDocumentVersion(
    actor: Actor,
    documentId: string,
    versionId: string,
    purpose: 'VIEW' | 'DOWNLOAD',
  ) {
    const doc = await this.prisma.dossierDocument.findFirst({
      where: { id: documentId, AND: [documentScope(actor, 'documents:read')] },
    });
    if (!doc) {
      await this.prisma.documentAccessEvent.create({
        data: {
          organizationId: actor.organizationId,
          actorId: actor.userId,
          targetType: 'DOSSIER',
          targetId: documentId,
          versionId,
          purpose,
          outcome: 'DENIED',
        },
      });
      fail('DOCUMENT_NOT_FOUND', 'Documento não encontrado no seu contexto.', 404);
    }
    const version = await this.prisma.dossierDocumentVersion.findFirst({
      where: { id: versionId, documentId },
      include: { storedObject: true },
    });
    if (
      !version?.storedObject ||
      version.persistenceState !== 'READY' ||
      !version.storedObject.verified ||
      version.storedObject.scanResult !== 'CLEAN'
    )
      fail(
        'DOCUMENT_NOT_READY',
        'Documento ainda não está disponível. Verifique a pendência de validação.',
        409,
      );
    return this.readAudited(
      actor,
      'DOSSIER',
      documentId,
      versionId,
      purpose,
      version.storedObject.bucket,
      version.storedObject.key,
      version.sha256,
      version.fileSize,
      version.originalName,
      version.verifiedMime ?? version.declaredMime,
      version.storedObject.backend,
    );
  }

  async downloadOrigin(
    actor: Actor,
    origin: 'PROPOSAL' | 'CONTRACT',
    id: string,
    purpose: 'VIEW' | 'DOWNLOAD',
  ) {
    const permission = origin === 'PROPOSAL' ? 'proposals:download' : 'contracts:download';
    if (!organizationGrant(actor, permission)) {
      await this.prisma.documentAccessEvent.create({
        data: {
          organizationId: actor.organizationId,
          actorId: actor.userId,
          targetType: origin,
          targetId: id,
          versionId: id,
          purpose,
          outcome: 'DENIED',
        },
      });
      fail('ACCESS_DENIED', 'Você não tem permissão para baixar este documento.', 403);
    }
    const doc =
      origin === 'PROPOSAL'
        ? await this.prisma.proposalDocument.findFirst({
            where: { id, organizationId: actor.organizationId },
          })
        : await this.prisma.contractDocument.findFirst({
            where: { id, organizationId: actor.organizationId },
          });
    if (!doc || doc.generationStatus !== 'READY')
      fail('DOCUMENT_NOT_FOUND', 'Documento não encontrado.', 404);
    return this.readAudited(
      actor,
      origin,
      id,
      id,
      purpose,
      doc.s3Bucket,
      doc.s3Key,
      doc.contentHash,
      doc.fileSize,
      doc.fileName,
      doc.mimeType,
    );
  }

  private async readAudited(
    actor: Actor,
    targetType: string,
    targetId: string,
    versionId: string,
    purpose: 'VIEW' | 'DOWNLOAD',
    bucket: string,
    key: string,
    sha256: string,
    fileSize: number,
    fileName: string,
    mimeType: string,
    backend?: string,
  ) {
    const event = await this.prisma.documentAccessEvent.create({
      data: {
        organizationId: actor.organizationId,
        actorId: actor.userId,
        targetType,
        targetId,
        versionId,
        purpose,
        outcome: 'ATTEMPT',
      },
    });
    try {
      const buffer = await this.storage.download(bucket, key, backend);
      if (buffer.length !== fileSize || this.storage.computeHash(buffer) !== sha256)
        fail(
          'DOCUMENT_INTEGRITY_FAILED',
          'Integridade do arquivo inválida. Solicite reconciliação.',
          503,
        );
      await this.prisma.documentAccessEvent.update({
        where: { id: event.id },
        data: { outcome: 'SUCCESS' },
      });
      return { buffer, fileName, mimeType, sha256 };
    } catch (error) {
      await this.prisma.documentAccessEvent.update({
        where: { id: event.id },
        data: { outcome: 'ERROR' },
      });
      if (targetType === 'DOSSIER')
        await this.prisma.dossierDocumentVersion.updateMany({
          where: { id: versionId, persistenceState: 'READY' },
          data: { persistenceState: 'MISSING' },
        });
      throw error;
    }
  }

  async uploadContext(actor: Actor, customerId: string): Promise<DossierUploadContextDto> {
    documentScope(actor, 'documents:upload');
    if (
      !(await this.prisma.customer.findFirst({
        where: { id: customerId, AND: [customerScope(actor, 'documents:upload')] },
      }))
    )
      fail('CUSTOMER_NOT_FOUND', 'Cliente não encontrado no seu contexto.', 404);
    const organizational = organizationGrant(actor, 'documents:upload');
    const own = actor.grants.some((g) => g.permission === 'documents:upload' && g.scope === 'own');
    const requiresWorkOrder = !organizational && !own;
    const workOrders = requiresWorkOrder
      ? await this.prisma.workOrder.findMany({
          where: {
            organizationId: actor.organizationId,
            project: { opportunity: { customerId, organizationId: actor.organizationId } },
            OR: [{ assignedLeaderId: actor.userId }, { assignedTeamId: { in: actor.teamIds } }],
          },
          select: { id: true, title: true },
        })
      : [];
    const opportunities =
      !organizational && own
        ? await this.prisma.opportunity.findMany({
            where: { organizationId: actor.organizationId, customerId, ownerUserId: actor.userId },
            select: { id: true, title: true },
          })
        : [];
    return {
      categories: requiresWorkOrder
        ? photoCategories
        : DOSSIER_CATEGORIES.filter(
            (category) =>
              organizationGrant(actor, 'documents:identity_read') ||
              !sensitiveCategories.includes(category),
          ),
      requiresWorkOrder,
      requiresOpportunity: !organizational && own,
      workOrders,
      opportunities,
    };
  }

  async history(actor: Actor, documentId: string): Promise<DossierHistoryViewDto> {
    const doc = await this.prisma.dossierDocument.findFirst({
      where: { id: documentId, AND: [documentScope(actor, 'documents:read')] },
      include: { versions: { orderBy: { versionNumber: 'desc' } } },
    });
    if (!doc) fail('DOCUMENT_NOT_FOUND', 'Documento não encontrado.', 404);
    const events = await this.prisma.auditEvent.findMany({
      where: {
        organizationId: actor.organizationId,
        entityId: documentId,
        action: { startsWith: 'document.' },
      },
      orderBy: { createdAt: 'desc' },
      select: { action: true, actorId: true, createdAt: true },
    });
    return {
      metadataVersion: doc.metadataVersion,
      archiveReason: doc.archiveReason,
      versions: doc.versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        originalName: v.originalName,
        fileSize: v.fileSize,
        declaredMime: v.declaredMime,
        verifiedMime: v.verifiedMime,
        sha256: v.sha256,
        persistenceState: v.persistenceState,
        createdAt: v.createdAt.toISOString(),
      })),
      events: events.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
    };
  }

  async listRepresentatives(actor: Actor, customerId: string): Promise<RepresentativeViewDto[]> {
    if (!organizationGrant(actor, 'documents:identity_read'))
      fail('ACCESS_DENIED', 'Você não tem permissão para dados de representantes.', 403);
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, organizationId: actor.organizationId },
    });
    if (!customer) fail('CUSTOMER_NOT_FOUND', 'Cliente não encontrado.', 404);
    const reps = await this.prisma.customerRepresentative.findMany({
      where: { customerId, organizationId: actor.organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return reps.map((rep) => ({
      ...rep,
      createdAt: rep.createdAt.toISOString(),
      updatedAt: rep.updatedAt.toISOString(),
    }));
  }

  // Mutations live in DossierUploadsService; this service projects and reads documents.
}

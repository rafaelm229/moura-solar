import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../proposal/storage.service';
import {
  type Actor,
  CreateDocumentUploadDto,
  CompleteUploadDto,
  CustomerRepresentativeDto,
  DossierDocumentViewDto,
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
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, organizationId: actor.organizationId },
    });
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado na organização.');
    }

    // 1. Fetch Dossier documents
    const dossierDocs = await this.prisma.dossierDocument.findMany({
      where: {
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
        ...(filters?.projectId
          ? { projectLinks: { some: { projectId: filters.projectId } } }
          : {}),
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
    if (!filters?.category || filters.category === 'COMMERCIAL_PROPOSAL') {
      const opps = await this.prisma.opportunity.findMany({
        where: { customerId, organizationId: actor.organizationId },
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
              versionNumber: 1,
              originalName: pDoc.fileName,
              fileSize: pDoc.fileSize,
              declaredMime: pDoc.mimeType,
              verifiedMime: pDoc.mimeType,
              sha256: pDoc.contentHash,
              persistenceState: pDoc.generationStatus === 'SUCCESS' ? 'READY' : 'PENDING_UPLOAD',
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
    if (!filters?.category || filters.category === 'CONTRACT_ANNEX') {
      const contractDocs = await this.prisma.contractDocument.findMany({
        where: {
          organizationId: actor.organizationId,
          contractVersion: {
            contract: {
              opportunity: {
                customerId,
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
            persistenceState: cDoc.generationStatus === 'SUCCESS' ? 'READY' : 'PENDING_UPLOAD',
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
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createUpload(
    actor: Actor,
    customerId: string,
    dto: CreateDocumentUploadDto,
  ): Promise<DossierDocumentViewDto> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, organizationId: actor.organizationId },
    });
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado na organização.');
    }

    if (dto.utilityUnitId) {
      const uc = await this.prisma.utilityUnit.findFirst({
        where: {
          id: dto.utilityUnitId,
          customerId,
          organizationId: actor.organizationId,
        },
      });
      if (!uc) {
        throw new BadRequestException('Unidade Consumidora não pertence a este cliente.');
      }
    }

    if (dto.opportunityId) {
      const opp = await this.prisma.opportunity.findFirst({
        where: {
          id: dto.opportunityId,
          customerId,
          organizationId: actor.organizationId,
        },
      });
      if (!opp) {
        throw new BadRequestException('Oportunidade não pertence a este cliente.');
      }
    }

    if (dto.projectId) {
      const project = await this.prisma.operationalProject.findFirst({
        where: {
          id: dto.projectId,
          organizationId: actor.organizationId,
          opportunity: { customerId },
        },
      });
      if (!project) {
        throw new BadRequestException('Projeto não pertence a este cliente.');
      }
    }

    if (dto.representativeId) {
      const rep = await this.prisma.customerRepresentative.findFirst({
        where: {
          id: dto.representativeId,
          customerId,
          organizationId: actor.organizationId,
        },
      });
      if (!rep) {
        throw new BadRequestException('Representante não pertence a este cliente.');
      }
    }

    const sanitizedName = this.storage.sanitizeFileName(dto.fileName);

    // Direct base64 upload flow
    if (dto.fileBase64) {
      const buffer = Buffer.from(dto.fileBase64, 'base64');
      if (buffer.length === 0) {
        throw new BadRequestException('Arquivo enviado está vazio.');
      }

      if (buffer.length > 20 * 1024 * 1024) {
        throw new BadRequestException('Arquivo excede o limite máximo de 20 MiB.');
      }

      const isValidMagic = this.storage.validateMagicBytes(buffer, dto.declaredMime);
      if (!isValidMagic) {
        throw new BadRequestException(
          'Conteúdo do arquivo não corresponde ao formato declarado (magic bytes inválidos).',
        );
      }

      const sha256 = this.storage.computeHash(buffer);
      const bucket = 'moura-solar-dossier';
      const key = `customers/${customerId}/${Date.now()}_${sanitizedName}`;

      const uploadRes = await this.storage.upload(bucket, key, buffer, dto.declaredMime);

      return this.prisma.$transaction(async (tx) => {
        const storedObject = await tx.storedObject.create({
          data: {
            organizationId: actor.organizationId,
            backend: uploadRes.backend,
            bucket: uploadRes.bucket,
            key: uploadRes.key,
            sha256,
            byteSize: uploadRes.byteSize,
            verified: true,
            scanResult: 'CLEAN',
          },
        });

        const doc = await tx.dossierDocument.create({
          data: {
            organizationId: actor.organizationId,
            customerId,
            category: dto.category,
            title: dto.title,
            status: 'ACTIVE',
            purpose: dto.purpose,
            createdBy: actor.userId,
            versions: {
              create: {
                versionNumber: 1,
                originalName: dto.fileName,
                fileSize: uploadRes.byteSize,
                declaredMime: dto.declaredMime,
                verifiedMime: dto.declaredMime,
                sha256,
                persistenceState: 'READY',
                storedObjectId: storedObject.id,
                authorId: actor.userId,
              },
            },
          },
          include: {
            versions: true,
          },
        });

        if (dto.utilityUnitId) {
          await tx.documentUtilityUnitLink.create({
            data: { documentId: doc.id, utilityUnitId: dto.utilityUnitId },
          });
        }
        if (dto.opportunityId) {
          await tx.documentOpportunityLink.create({
            data: { documentId: doc.id, opportunityId: dto.opportunityId },
          });
        }
        if (dto.projectId) {
          await tx.documentProjectLink.create({
            data: { documentId: doc.id, projectId: dto.projectId },
          });
        }
        if (dto.representativeId) {
          await tx.documentRepresentativeLink.create({
            data: { documentId: doc.id, representativeId: dto.representativeId },
          });
        }
        if (dto.contractId) {
          await tx.documentContractLink.create({
            data: { documentId: doc.id, contractId: dto.contractId },
          });
        }
        if (dto.workOrderId) {
          await tx.documentWorkOrderLink.create({
            data: {
              documentId: doc.id,
              workOrderId: dto.workOrderId,
              phase: dto.phase,
            },
          });
        }

        const v = doc.versions[0];
        if (!v) {
          throw new Error('Falha ao inicializar versão do documento.');
        }

        return {
          id: doc.id,
          origin: 'DOSSIER',
          category: doc.category,
          title: doc.title,
          status: doc.status,
          purpose: doc.purpose,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
          createdBy: doc.createdBy,
          currentVersion: {
            id: v.id,
            versionNumber: v.versionNumber,
            originalName: v.originalName,
            fileSize: v.fileSize,
            declaredMime: v.declaredMime,
            verifiedMime: v.verifiedMime,
            sha256: v.sha256,
            persistenceState: v.persistenceState,
            createdAt: v.createdAt.toISOString(),
          },
          links: {
            utilityUnitIds: dto.utilityUnitId ? [dto.utilityUnitId] : [],
            opportunityIds: dto.opportunityId ? [dto.opportunityId] : [],
            projectIds: dto.projectId ? [dto.projectId] : [],
            representativeIds: dto.representativeId ? [dto.representativeId] : [],
            contractIds: dto.contractId ? [dto.contractId] : [],
          },
        };
      });
    }

    // Staging intention flow
    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.dossierDocument.create({
        data: {
          organizationId: actor.organizationId,
          customerId,
          category: dto.category,
          title: dto.title,
          status: 'ACTIVE',
          purpose: dto.purpose,
          createdBy: actor.userId,
          versions: {
            create: {
              versionNumber: 1,
              originalName: dto.fileName,
              fileSize: dto.fileSize,
              declaredMime: dto.declaredMime,
              sha256: dto.sha256 || 'pending',
              persistenceState: 'PENDING_UPLOAD',
              authorId: actor.userId,
            },
          },
        },
        include: { versions: true },
      });

      if (dto.utilityUnitId) {
        await tx.documentUtilityUnitLink.create({
          data: { documentId: doc.id, utilityUnitId: dto.utilityUnitId },
        });
      }
      if (dto.opportunityId) {
        await tx.documentOpportunityLink.create({
          data: { documentId: doc.id, opportunityId: dto.opportunityId },
        });
      }
      if (dto.projectId) {
        await tx.documentProjectLink.create({
          data: { documentId: doc.id, projectId: dto.projectId },
        });
      }

      const v = doc.versions[0];
      if (!v) {
        throw new Error('Falha ao inicializar versão do documento.');
      }

      return {
        id: doc.id,
        origin: 'DOSSIER',
        category: doc.category,
        title: doc.title,
        status: doc.status,
        purpose: doc.purpose,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        createdBy: doc.createdBy,
        currentVersion: {
          id: v.id,
          versionNumber: v.versionNumber,
          originalName: v.originalName,
          fileSize: v.fileSize,
          declaredMime: v.declaredMime,
          verifiedMime: null,
          sha256: v.sha256,
          persistenceState: v.persistenceState,
          createdAt: v.createdAt.toISOString(),
        },
        links: {
          utilityUnitIds: dto.utilityUnitId ? [dto.utilityUnitId] : [],
          opportunityIds: dto.opportunityId ? [dto.opportunityId] : [],
          projectIds: dto.projectId ? [dto.projectId] : [],
          representativeIds: [],
          contractIds: [],
        },
      };
    });
  }

  async completeUpload(
    actor: Actor,
    versionId: string,
    dto: CompleteUploadDto,
  ): Promise<DossierDocumentViewDto> {
    const version = await this.prisma.dossierDocumentVersion.findFirst({
      where: {
        id: versionId,
        document: { organizationId: actor.organizationId },
      },
      include: {
        document: {
          include: {
            utilityUnitLinks: true,
            opportunityLinks: true,
            projectLinks: true,
            representativeLinks: true,
            contractLinks: true,
          },
        },
      },
    });

    if (!version) {
      throw new NotFoundException('Versão de documento não encontrada.');
    }

    if (version.persistenceState === 'READY') {
      return this.formatDocView(version.document, version);
    }

    if (!dto.fileBase64) {
      throw new BadRequestException('Conteúdo do arquivo não fornecido para conclusão.');
    }

    const buffer = Buffer.from(dto.fileBase64, 'base64');
    if (!this.storage.validateMagicBytes(buffer, version.declaredMime)) {
      throw new BadRequestException('Conteúdo do arquivo inválido para o MIME declarado.');
    }

    const sha256 = this.storage.computeHash(buffer);
    const bucket = 'moura-solar-dossier';
    const key = `customers/${version.document.customerId}/${version.documentId}/v${version.versionNumber}_${this.storage.sanitizeFileName(version.originalName)}`;

    const uploadRes = await this.storage.upload(bucket, key, buffer, version.declaredMime);

    return this.prisma.$transaction(async (tx) => {
      const stored = await tx.storedObject.create({
        data: {
          organizationId: actor.organizationId,
          backend: uploadRes.backend,
          bucket: uploadRes.bucket,
          key: uploadRes.key,
          sha256,
          byteSize: uploadRes.byteSize,
          verified: true,
          scanResult: 'CLEAN',
        },
      });

      const updated = await tx.dossierDocumentVersion.update({
        where: { id: version.id },
        data: {
          persistenceState: 'READY',
          sha256,
          fileSize: uploadRes.byteSize,
          verifiedMime: version.declaredMime,
          storedObjectId: stored.id,
        },
      });

      return this.formatDocView(version.document, updated);
    });
  }

  async downloadDocumentVersion(
    actor: Actor,
    documentId: string,
    versionId: string,
    purpose: 'VIEW' | 'DOWNLOAD',
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ buffer: Buffer; fileName: string; mimeType: string; sha256: string }> {
    const doc = await this.prisma.dossierDocument.findFirst({
      where: { id: documentId, organizationId: actor.organizationId },
    });
    if (!doc) {
      throw new NotFoundException('Documento não encontrado.');
    }

    const version = await this.prisma.dossierDocumentVersion.findFirst({
      where: { id: versionId, documentId },
      include: { storedObject: true },
    });

    if (!version || !version.storedObject) {
      throw new NotFoundException('Versão de documento ou arquivo físico não localizado.');
    }

    if (version.persistenceState !== 'READY') {
      throw new BadRequestException('Documento ainda não está pronto para download.');
    }

    // Record audit access event
    await this.prisma.documentAccessEvent.create({
      data: {
        organizationId: actor.organizationId,
        actorId: actor.userId,
        targetType: 'DOSSIER',
        targetId: documentId,
        versionId,
        purpose,
        outcome: 'SUCCESS',
        ipAddress,
        userAgent,
      },
    });

    const buffer = await this.storage.download(
      version.storedObject.bucket,
      version.storedObject.key,
    );

    return {
      buffer,
      fileName: version.originalName,
      mimeType: version.verifiedMime || version.declaredMime,
      sha256: version.sha256,
    };
  }

  async archiveDocument(actor: Actor, documentId: string, _reason?: string): Promise<void> {
    const doc = await this.prisma.dossierDocument.findFirst({
      where: { id: documentId, organizationId: actor.organizationId },
    });
    if (!doc) {
      throw new NotFoundException('Documento não encontrado.');
    }

    await this.prisma.dossierDocument.update({
      where: { id: documentId },
      data: { status: 'ARCHIVED' },
    });
  }

  async listRepresentatives(actor: Actor, customerId: string): Promise<RepresentativeViewDto[]> {
    const reps = await this.prisma.customerRepresentative.findMany({
      where: { customerId, organizationId: actor.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return reps.map((r) => ({
      id: r.id,
      customerId: r.customerId,
      name: r.name,
      documentNumber: r.documentNumber,
      role: r.role,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async createRepresentative(
    actor: Actor,
    customerId: string,
    dto: CustomerRepresentativeDto,
  ): Promise<RepresentativeViewDto> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, organizationId: actor.organizationId },
    });
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    const rep = await this.prisma.customerRepresentative.create({
      data: {
        organizationId: actor.organizationId,
        customerId,
        name: dto.name,
        documentNumber: dto.documentNumber,
        role: dto.role,
      },
    });

    return {
      id: rep.id,
      customerId: rep.customerId,
      name: rep.name,
      documentNumber: rep.documentNumber,
      role: rep.role,
      createdAt: rep.createdAt.toISOString(),
      updatedAt: rep.updatedAt.toISOString(),
    };
  }

  private formatDocView(doc: any, v: any): DossierDocumentViewDto {
    return {
      id: doc.id,
      origin: 'DOSSIER',
      category: doc.category,
      title: doc.title,
      status: doc.status,
      purpose: doc.purpose,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      createdBy: doc.createdBy,
      currentVersion: v
        ? {
            id: v.id,
            versionNumber: v.versionNumber,
            originalName: v.originalName,
            fileSize: v.fileSize,
            declaredMime: v.declaredMime,
            verifiedMime: v.verifiedMime,
            sha256: v.sha256,
            persistenceState: v.persistenceState,
            createdAt: v.createdAt.toISOString(),
          }
        : null,
      links: {
        utilityUnitIds: doc.utilityUnitLinks?.map((l: any) => l.utilityUnitId) || [],
        opportunityIds: doc.opportunityLinks?.map((l: any) => l.opportunityId) || [],
        projectIds: doc.projectLinks?.map((l: any) => l.projectId) || [],
        representativeIds: doc.representativeLinks?.map((l: any) => l.representativeId) || [],
        contractIds: doc.contractLinks?.map((l: any) => l.contractId) || [],
      },
    };
  }
}

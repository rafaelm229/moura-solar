import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { RequirePermission, type IdentityRequest } from '../identity/identity.guard';
import { DossierService } from './dossier.service';
import {
  CreateDocumentUploadDto,
  CompleteUploadDto,
  CustomerRepresentativeDto,
  DossierDocumentViewDto,
  RepresentativeViewDto,
  ArchiveDocumentDto,
} from './dossier.dto';
import { PrismaService } from '../database/prisma.service';

@ApiTags('dossier')
@ApiCookieAuth()
@Controller()
export class DossierController {
  constructor(
    private readonly service: DossierService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('customers/:customerId/documents')
  @RequirePermission('documents:read')
  @ApiOperation({ summary: 'Listar documentos do dossiê do cliente (incluindo propostas e contratos)' })
  @ApiOkResponse({ type: [DossierDocumentViewDto] })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'utilityUnitId', required: false })
  @ApiQuery({ name: 'opportunityId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async listCustomerDocuments(
    @Req() req: IdentityRequest,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('utilityUnitId') utilityUnitId?: string,
    @Query('opportunityId') opportunityId?: string,
    @Query('projectId') projectId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<DossierDocumentViewDto[]> {
    return this.service.listCustomerDocuments(req.actor, customerId, {
      category,
      status,
      utilityUnitId,
      opportunityId,
      projectId,
      from,
      to,
    });
  }

  @Get('opportunities/:opportunityId/documents')
  @RequirePermission('documents:read')
  @ApiOperation({ summary: 'Listar documentos do dossiê vinculados a uma oportunidade' })
  @ApiOkResponse({ type: [DossierDocumentViewDto] })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false })
  async listOpportunityDocuments(
    @Req() req: IdentityRequest,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ): Promise<DossierDocumentViewDto[]> {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, organizationId: req.actor.organizationId },
      select: { customerId: true },
    });
    if (!opp) {
      return [];
    }
    return this.service.listCustomerDocuments(req.actor, opp.customerId, {
      opportunityId,
      category,
      status,
    });
  }

  @Post('customers/:customerId/document-uploads')
  @RequirePermission('documents:upload')
  @ApiOperation({ summary: 'Iniciar upload ou registrar documento no dossiê do cliente' })
  @HttpCode(201)
  @ApiBody({ type: CreateDocumentUploadDto })
  @ApiOkResponse({ type: DossierDocumentViewDto })
  async createDocumentUpload(
    @Req() req: IdentityRequest,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: CreateDocumentUploadDto,
  ): Promise<DossierDocumentViewDto> {
    return this.service.createUpload(req.actor, customerId, dto);
  }

  @Post('document-uploads/:versionId/complete')
  @RequirePermission('documents:upload')
  @ApiOperation({ summary: 'Concluir upload e validar persistência do arquivo' })
  @HttpCode(200)
  @ApiBody({ type: CompleteUploadDto })
  @ApiOkResponse({ type: DossierDocumentViewDto })
  async completeDocumentUpload(
    @Req() req: IdentityRequest,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: CompleteUploadDto,
  ): Promise<DossierDocumentViewDto> {
    return this.service.completeUpload(req.actor, versionId, dto);
  }

  @Get('documents/:documentId/versions/:versionId/content')
  @RequirePermission('documents:read')
  @ApiOperation({ summary: 'Obter stream ou download do arquivo de uma versão documental' })
  @ApiQuery({ name: 'purpose', enum: ['VIEW', 'DOWNLOAD'], required: false })
  async downloadContent(
    @Req() req: IdentityRequest,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Query('purpose') purpose: 'VIEW' | 'DOWNLOAD' = 'DOWNLOAD',
    @Res() res: Response,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    const userAgent = req.header('user-agent');

    const result = await this.service.downloadDocumentVersion(
      req.actor,
      documentId,
      versionId,
      purpose,
      ipAddress,
      userAgent,
    );

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `${purpose === 'VIEW' ? 'inline' : 'attachment'}; filename="${encodeURIComponent(result.fileName)}"`,
    );
    res.setHeader('Content-Length', result.buffer.length.toString());
    res.setHeader('ETag', `"${result.sha256}"`);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.send(result.buffer);
  }

  @Post('documents/:documentId/archive')
  @RequirePermission('documents:upload')
  @ApiOperation({ summary: 'Arquivar logicamente documento do dossiê' })
  @HttpCode(200)
  @ApiBody({ type: ArchiveDocumentDto, required: false })
  async archiveDocument(
    @Req() req: IdentityRequest,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() body?: ArchiveDocumentDto,
  ): Promise<{ success: boolean }> {
    await this.service.archiveDocument(req.actor, documentId, body?.reason);
    return { success: true };
  }

  @Get('customers/:customerId/representatives')
  @RequirePermission('documents:read')
  @ApiOperation({ summary: 'Listar representantes legais ou técnicos do cliente' })
  @ApiOkResponse({ type: [RepresentativeViewDto] })
  async listRepresentatives(
    @Req() req: IdentityRequest,
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ): Promise<RepresentativeViewDto[]> {
    return this.service.listRepresentatives(req.actor, customerId);
  }

  @Post('customers/:customerId/representatives')
  @RequirePermission('documents:upload')
  @ApiOperation({ summary: 'Cadastrar representante legal ou técnico do cliente' })
  @HttpCode(201)
  @ApiBody({ type: CustomerRepresentativeDto })
  @ApiOkResponse({ type: RepresentativeViewDto })
  async createRepresentative(
    @Req() req: IdentityRequest,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: CustomerRepresentativeDto,
  ): Promise<RepresentativeViewDto> {
    return this.service.createRepresentative(req.actor, customerId, dto);
  }
}

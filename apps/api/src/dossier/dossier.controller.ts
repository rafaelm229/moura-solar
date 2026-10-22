import {
  Body,
  Controller,
  Get,
  Headers,
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
  ApiHeader,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { RequirePermission, type IdentityRequest } from '../identity/identity.guard';
import { DossierUploadsService } from './dossier-uploads.service';
import { fail } from '../identity/security';
import { DossierService } from './dossier.service';
import {
  CreateDocumentUploadDto,
  CreateDocumentVersionDto,
  CompleteUploadDto,
  CustomerRepresentativeDto,
  DossierDocumentViewDto,
  DossierHistoryViewDto,
  DossierUploadContextDto,
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
    private readonly uploads: DossierUploadsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('customers/:customerId/documents')
  @RequirePermission('documents:read', false)
  @ApiOperation({
    summary: 'Listar documentos do dossiê do cliente (incluindo propostas e contratos)',
  })
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

  @Get('customers/:customerId/document-context')
  @RequirePermission('documents:upload', false)
  @ApiOkResponse({ type: DossierUploadContextDto })
  async uploadContext(
    @Req() req: IdentityRequest,
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ) {
    return this.service.uploadContext(req.actor, customerId);
  }

  @Get('opportunities/:opportunityId/documents')
  @RequirePermission('documents:read', false)
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

  @ApiHeader({ name: 'idempotency-key', required: true })
  @Post('customers/:customerId/document-uploads')
  @RequirePermission('documents:upload', false)
  @ApiOperation({ summary: 'Iniciar upload ou registrar documento no dossiê do cliente' })
  @HttpCode(201)
  @ApiBody({ type: CreateDocumentUploadDto })
  @ApiOkResponse({ type: DossierDocumentViewDto })
  async createDocumentUpload(
    @Req() req: IdentityRequest,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: CreateDocumentUploadDto,
    @Headers('idempotency-key') key?: string,
  ): Promise<DossierDocumentViewDto> {
    return this.uploads.createUpload(req.actor, customerId, dto, key);
  }

  @ApiHeader({ name: 'idempotency-key', required: true })
  @Post('document-uploads/:versionId/complete')
  @RequirePermission('documents:upload', false)
  @ApiOperation({ summary: 'Concluir upload e validar persistência do arquivo' })
  @HttpCode(200)
  @ApiBody({ type: CompleteUploadDto })
  @ApiOkResponse({ type: DossierDocumentViewDto })
  async completeDocumentUpload(
    @Req() req: IdentityRequest,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: CompleteUploadDto,
    @Headers('idempotency-key') key?: string,
  ): Promise<DossierDocumentViewDto> {
    return this.uploads.completeUpload(req.actor, versionId, dto, key);
  }

  @Get('documents/:documentId/versions/:versionId/content')
  @RequirePermission('documents:read', false)
  @ApiOperation({ summary: 'Obter stream ou download do arquivo de uma versão documental' })
  @ApiQuery({ name: 'purpose', enum: ['VIEW', 'DOWNLOAD'], required: false })
  async downloadContent(
    @Req() req: IdentityRequest,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Query('purpose') purpose: 'VIEW' | 'DOWNLOAD' = 'DOWNLOAD',
    @Res() res: Response,
  ) {
    if (!['VIEW', 'DOWNLOAD'].includes(purpose)) fail('INVALID_PURPOSE', 'Finalidade inválida.');

    const result = await this.service.downloadDocumentVersion(
      req.actor,
      documentId,
      versionId,
      purpose,
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

  @ApiHeader({ name: 'idempotency-key', required: true })
  @Post('documents/:documentId/archive')
  @RequirePermission('documents:upload', false)
  @ApiOperation({ summary: 'Arquivar logicamente documento do dossiê' })
  @HttpCode(200)
  @ApiBody({ type: ArchiveDocumentDto, required: false })
  async archiveDocument(
    @Req() req: IdentityRequest,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() body: ArchiveDocumentDto,
    @Headers('idempotency-key') key?: string,
  ): Promise<{ success: boolean }> {
    return this.uploads.archiveDocument(req.actor, documentId, body, key);
  }

  @Get('customers/:customerId/representatives')
  @RequirePermission('documents:read', false)
  @ApiOperation({ summary: 'Listar representantes legais ou técnicos do cliente' })
  @ApiOkResponse({ type: [RepresentativeViewDto] })
  async listRepresentatives(
    @Req() req: IdentityRequest,
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ): Promise<RepresentativeViewDto[]> {
    return this.service.listRepresentatives(req.actor, customerId);
  }

  @ApiHeader({ name: 'idempotency-key', required: true })
  @Post('customers/:customerId/representatives')
  @RequirePermission('documents:upload', false)
  @ApiOperation({ summary: 'Cadastrar representante legal ou técnico do cliente' })
  @HttpCode(201)
  @ApiBody({ type: CustomerRepresentativeDto })
  @ApiOkResponse({ type: RepresentativeViewDto })
  async createRepresentative(
    @Req() req: IdentityRequest,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: CustomerRepresentativeDto,
    @Headers('idempotency-key') key?: string,
  ): Promise<RepresentativeViewDto> {
    return this.uploads.createRepresentative(req.actor, customerId, dto, key);
  }

  @Post('documents/:documentId/versions')
  @RequirePermission('documents:upload', false)
  @ApiHeader({ name: 'idempotency-key', required: true })
  @ApiOkResponse({ type: DossierDocumentViewDto })
  async replace(
    @Req() req: IdentityRequest,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: CreateDocumentVersionDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.uploads.replace(req.actor, documentId, dto, key);
  }

  @ApiOkResponse({ type: DossierHistoryViewDto })
  @Get('documents/:documentId/history')
  @RequirePermission('documents:read', false)
  async history(
    @Req() req: IdentityRequest,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.service.history(req.actor, documentId);
  }

  @Post('document-uploads/:versionId/cancel')
  @RequirePermission('documents:upload', false)
  @ApiHeader({ name: 'idempotency-key', required: true })
  async cancel(
    @Req() req: IdentityRequest,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: CompleteUploadDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.uploads.cancel(req.actor, versionId, dto, key);
  }

  @ApiHeader({ name: 'idempotency-key', required: true })
  @Post('document-uploads/:versionId/reconcile')
  @RequirePermission('documents:upload', false)
  @HttpCode(200)
  @ApiOkResponse({ type: DossierDocumentViewDto })
  async reconcile(
    @Req() req: IdentityRequest,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.uploads.reconcile(req.actor, versionId, key);
  }

  @Get('dossier/proposal-documents/:documentId/content')
  @RequirePermission('documents:read', false)
  async proposalContent(
    @Req() req: IdentityRequest,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Query('purpose') purpose: 'VIEW' | 'DOWNLOAD' = 'DOWNLOAD',
    @Res() res: Response,
  ) {
    return this.originContent(req, 'PROPOSAL', documentId, purpose, res);
  }

  @Get('dossier/contract-documents/:documentId/content')
  @RequirePermission('documents:read', false)
  async contractContent(
    @Req() req: IdentityRequest,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Query('purpose') purpose: 'VIEW' | 'DOWNLOAD' = 'DOWNLOAD',
    @Res() res: Response,
  ) {
    return this.originContent(req, 'CONTRACT', documentId, purpose, res);
  }

  private async originContent(
    req: IdentityRequest,
    origin: 'PROPOSAL' | 'CONTRACT',
    id: string,
    purpose: 'VIEW' | 'DOWNLOAD',
    res: Response,
  ) {
    if (!['VIEW', 'DOWNLOAD'].includes(purpose)) fail('INVALID_PURPOSE', 'Finalidade inválida.');
    const result = await this.service.downloadOrigin(req.actor, origin, id, purpose);
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `${purpose === 'VIEW' ? 'inline' : 'attachment'}; filename="${encodeURIComponent(result.fileName)}"`,
    );
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('ETag', `"${result.sha256}"`);
    res.send(result.buffer);
  }
}

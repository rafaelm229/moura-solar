import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RequirePermission, type IdentityRequest } from '../identity/identity.guard';
import { ProposalService } from './proposal.service';
import {
  CreateProposalDto,
  UpdateProposalDraftDto,
  RecordProposalDeliveryDto,
  RecordProposalAcceptanceDto,
  RecordProposalRejectionDto,
} from './proposal.dto';

@ApiTags('proposals')
@ApiCookieAuth()
@Controller()
export class ProposalController {
  constructor(private readonly service: ProposalService) {}

  @Post('proposals')
  @RequirePermission('proposals:create')
  @HttpCode(201)
  @ApiBody({ type: CreateProposalDto })
  async createProposal(@Req() req: IdentityRequest, @Body() dto: CreateProposalDto) {
    return this.service.createProposal(req.actor.organizationId, req.actor.userId, dto);
  }

  @Get('proposals')
  @RequirePermission('proposals:read')
  @ApiQuery({ name: 'opportunityId', required: false })
  async listProposals(@Req() req: IdentityRequest, @Query('opportunityId') opportunityId?: string) {
    return this.service.listProposals(req.actor.organizationId, opportunityId);
  }

  @Get('opportunities/:opportunityId/proposals')
  @RequirePermission('proposals:read')
  async listOpportunityProposals(
    @Req() req: IdentityRequest,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
  ) {
    return this.service.listProposals(req.actor.organizationId, opportunityId);
  }

  @Get('proposals/:id')
  @RequirePermission('proposals:read')
  async getProposal(@Req() req: IdentityRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getProposal(req.actor.organizationId, id);
  }

  @Patch('proposal-versions/:id')
  @RequirePermission('proposals:update_draft')
  @ApiBody({ type: UpdateProposalDraftDto })
  async updateDraft(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProposalDraftDto,
  ) {
    return this.service.updateDraft(req.actor.organizationId, id, dto);
  }

  @Post('proposal-versions/:id/generate-pdf')
  @RequirePermission('proposals:generate')
  @HttpCode(200)
  async generatePdf(@Req() req: IdentityRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.generatePdf(req.actor.organizationId, id);
  }

  @Get('proposal-versions/:id/pdf')
  @RequirePermission('proposals:read')
  async getPdf(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const file = await this.service.getPdfBuffer(req.actor.organizationId, id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.fileName}"`);
    res.setHeader('Content-Length', file.buffer.length);
    res.setHeader('ETag', `"${file.contentHash}"`);
    res.end(file.buffer);
  }

  @Post('proposal-versions/:id/deliveries')
  @RequirePermission('proposals:send')
  @HttpCode(200)
  @ApiBody({ type: RecordProposalDeliveryDto })
  async recordDelivery(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordProposalDeliveryDto,
  ) {
    return this.service.recordDelivery(req.actor.organizationId, id, req.actor.userId, dto);
  }

  @Post('proposal-versions/:id/accept')
  @RequirePermission('proposals:accept')
  @HttpCode(200)
  @ApiBody({ type: RecordProposalAcceptanceDto })
  async recordAcceptance(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordProposalAcceptanceDto,
  ) {
    return this.service.recordAcceptance(
      req.actor.organizationId,
      id,
      req.actor.userId,
      dto,
      req.requestId ?? 'trace',
    );
  }

  @Post('proposal-versions/:id/reject')
  @RequirePermission('proposals:reject')
  @HttpCode(200)
  @ApiBody({ type: RecordProposalRejectionDto })
  async recordRejection(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordProposalRejectionDto,
  ) {
    return this.service.recordRejection(req.actor.organizationId, id, req.actor.userId, dto);
  }

  @Post('proposal-versions/:id/new-version')
  @RequirePermission('proposals:create')
  @HttpCode(201)
  async createNextVersion(@Req() req: IdentityRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.createNextVersion(req.actor.organizationId, id, req.actor.userId);
  }
}

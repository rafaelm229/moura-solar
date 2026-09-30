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
import { ContractService } from './contract.service';
import {
  CreateContractDto,
  UpdateContractDraftDto,
  RequestContractReviewDto,
  ApproveContractDto,
  RecordContractDeliveryDto,
  UploadSignedContractDto,
  VerifySignedContractDto,
  CreateAmendmentDto,
  CancelContractDto,
} from './contract.dto';

@ApiTags('contracts')
@ApiCookieAuth()
@Controller()
export class ContractController {
  constructor(private readonly service: ContractService) {}

  @Post('contracts')
  @RequirePermission('contracts:create')
  @HttpCode(201)
  @ApiBody({ type: CreateContractDto })
  async createContract(@Req() req: IdentityRequest, @Body() dto: CreateContractDto) {
    return this.service.createContract(req.actor.organizationId, req.actor.userId, dto);
  }

  @Get('contracts')
  @RequirePermission('contracts:read')
  @ApiQuery({ name: 'opportunityId', required: false })
  async listContracts(@Req() req: IdentityRequest, @Query('opportunityId') opportunityId?: string) {
    return this.service.listContracts(req.actor.organizationId, opportunityId);
  }

  @Get('opportunities/:opportunityId/contracts')
  @RequirePermission('contracts:read')
  async listOpportunityContracts(
    @Req() req: IdentityRequest,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
  ) {
    return this.service.listContracts(req.actor.organizationId, opportunityId);
  }

  @Get('contracts/:id')
  @RequirePermission('contracts:read')
  async getContract(@Req() req: IdentityRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getContract(req.actor.organizationId, id);
  }

  @Patch('contracts/:id/draft')
  @RequirePermission('contracts:update_draft')
  @ApiBody({ type: UpdateContractDraftDto })
  async updateDraft(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractDraftDto,
  ) {
    return this.service.updateDraft(req.actor.organizationId, id, dto);
  }

  @Post('contracts/:id/request-review')
  @RequirePermission('contracts:request_review')
  @HttpCode(200)
  @ApiBody({ type: RequestContractReviewDto })
  async requestReview(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestContractReviewDto,
  ) {
    return this.service.requestReview(req.actor.organizationId, id, req.actor.userId, dto);
  }

  @Post('contracts/:id/approve')
  @RequirePermission('contracts:approve')
  @HttpCode(200)
  @ApiBody({ type: ApproveContractDto })
  async approveContract(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveContractDto,
  ) {
    return this.service.approveContract(req.actor.organizationId, id, req.actor.userId, dto);
  }

  @Post('contracts/:id/deliveries')
  @RequirePermission('contracts:send')
  @HttpCode(201)
  @ApiBody({ type: RecordContractDeliveryDto })
  async recordDelivery(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordContractDeliveryDto,
  ) {
    return this.service.recordDelivery(req.actor.organizationId, id, req.actor.userId, dto);
  }

  @Post('contracts/:id/upload-signed')
  @RequirePermission('contracts:upload_signed')
  @HttpCode(201)
  @ApiBody({ type: UploadSignedContractDto })
  async uploadSigned(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UploadSignedContractDto,
  ) {
    return this.service.uploadSignedContract(req.actor.organizationId, id, req.actor.userId, dto);
  }

  @Post('contracts/:id/verify-signed')
  @RequirePermission('contracts:verify_signed')
  @HttpCode(200)
  @ApiBody({ type: VerifySignedContractDto })
  async verifySigned(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifySignedContractDto,
  ) {
    return this.service.verifySignedContract(req.actor.organizationId, id, req.actor.userId, dto);
  }

  @Post('contracts/:id/amendments')
  @RequirePermission('contracts:create_amendment')
  @HttpCode(201)
  @ApiBody({ type: CreateAmendmentDto })
  async createAmendment(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAmendmentDto,
  ) {
    return this.service.createAmendment(req.actor.organizationId, id, req.actor.userId, dto);
  }

  @Post('contracts/:id/cancel')
  @RequirePermission('contracts:cancel')
  @HttpCode(200)
  @ApiBody({ type: CancelContractDto })
  async cancelContract(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelContractDto,
  ) {
    return this.service.cancelContract(req.actor.organizationId, id, req.actor.userId, dto);
  }

  @Get('contracts/:id/docx')
  @RequirePermission('contracts:download')
  @ApiOkResponse({ description: 'Download da Minuta do Contrato em formato DOCX' })
  async downloadDocx(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, fileName, mimeType } = await this.service.getDocumentBuffer(
      req.actor.organizationId,
      id,
      'docx',
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  }

  @Get('contracts/:id/pdf')
  @RequirePermission('contracts:download')
  @ApiOkResponse({ description: 'Download do Contrato em formato PDF' })
  async downloadPdf(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, fileName, mimeType } = await this.service.getDocumentBuffer(
      req.actor.organizationId,
      id,
      'pdf',
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  }

  @Get('contracts/:id/signed')
  @RequirePermission('contracts:download')
  @ApiOkResponse({ description: 'Download do documento assinado' })
  async downloadSigned(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, fileName, mimeType } = await this.service.getDocumentBuffer(
      req.actor.organizationId,
      id,
      'signed',
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  }
}

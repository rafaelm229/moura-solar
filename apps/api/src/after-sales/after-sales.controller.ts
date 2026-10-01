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
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AfterSalesService } from './after-sales.service';
import { RequirePermission, type IdentityRequest } from '../identity/identity.guard';
import {
  AcceptServiceVisitQuoteDto,
  CreateMonitoringSystemDto,
  CreateServiceVisitQuoteDto,
  CreateSupportInteractionDto,
  CreateSupportTicketDto,
  CreateWarrantyClaimDto,
  CreateWarrantyCoverageDto,
  RecordConnectivityIncidentDto,
  RecordMonitoringReadingDto,
  RestoreConnectivityIncidentDto,
  TriageSupportTicketDto,
  UpdateSupportTicketStatusDto,
  UpdateWarrantyClaimDto,
} from './after-sales.dto';

@ApiTags('Pós-Venda, Suporte & Monitoramento')
@ApiCookieAuth('ms_access')
@Controller('after-sales')
export class AfterSalesController {
  constructor(private readonly service: AfterSalesService) {}

  // ==========================================
  // TICKETS / CHAMADOS
  // ==========================================

  @Post('tickets')
  @RequirePermission('after_sales:read')
  @HttpCode(201)
  @ApiBody({ type: CreateSupportTicketDto })
  async createTicket(@Req() req: IdentityRequest, @Body() dto: CreateSupportTicketDto) {
    return this.service.createSupportTicket(req.actor.organizationId, req.actor.userId, dto);
  }

  @Get('tickets')
  @RequirePermission('after_sales:read')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async listTickets(
    @Req() req: IdentityRequest,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('customerId') customerId?: string,
    @Query('projectId') projectId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listSupportTickets(req.actor.organizationId, {
      status,
      priority,
      customerId,
      projectId,
      search,
    });
  }

  @Get('tickets/:id')
  @RequirePermission('after_sales:read')
  async getTicket(@Req() req: IdentityRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getSupportTicket(req.actor.organizationId, id);
  }

  @Patch('tickets/:id/triage')
  @RequirePermission('after_sales:classify_coverage')
  @ApiBody({ type: TriageSupportTicketDto })
  async triageTicket(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TriageSupportTicketDto,
  ) {
    return this.service.triageTicket(req.actor.organizationId, req.actor.userId, id, dto);
  }

  @Patch('tickets/:id/status')
  @RequirePermission('after_sales:read')
  @ApiBody({ type: UpdateSupportTicketStatusDto })
  async updateTicketStatus(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupportTicketStatusDto,
  ) {
    return this.service.updateTicketStatus(req.actor.organizationId, req.actor.userId, id, dto);
  }

  @Post('tickets/:id/interactions')
  @RequirePermission('after_sales:read')
  @HttpCode(201)
  @ApiBody({ type: CreateSupportInteractionDto })
  async addInteraction(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSupportInteractionDto,
  ) {
    return this.service.addInteraction(req.actor.organizationId, req.actor.userId, id, dto);
  }

  // ==========================================
  // TERMOS DE GARANTIA & RMA
  // ==========================================

  @Get('projects/:projectId/warranties')
  @RequirePermission('after_sales:read')
  async listWarrantyCoverages(
    @Req() req: IdentityRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.service.listWarrantyCoverages(req.actor.organizationId, projectId);
  }

  @Post('projects/:projectId/warranties')
  @RequirePermission('warranties:manage')
  @HttpCode(201)
  @ApiBody({ type: CreateWarrantyCoverageDto })
  async createWarrantyCoverage(
    @Req() req: IdentityRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateWarrantyCoverageDto,
  ) {
    return this.service.createWarrantyCoverage(req.actor.organizationId, projectId, dto);
  }

  @Post('tickets/:id/warranty-claims')
  @RequirePermission('warranties:manage')
  @HttpCode(201)
  @ApiBody({ type: CreateWarrantyClaimDto })
  async createWarrantyClaim(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateWarrantyClaimDto,
  ) {
    return this.service.createWarrantyClaim(req.actor.organizationId, id, dto);
  }

  @Patch('warranty-claims/:id')
  @RequirePermission('after_sales:close_warranty')
  @ApiBody({ type: UpdateWarrantyClaimDto })
  async updateWarrantyClaim(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWarrantyClaimDto,
  ) {
    return this.service.updateWarrantyClaim(req.actor.organizationId, id, dto);
  }

  // ==========================================
  // ORÇAMENTOS DE VISITA TÉCNICA
  // ==========================================

  @Post('tickets/:id/quotes')
  @RequirePermission('after_sales:request_charge')
  @HttpCode(201)
  @ApiBody({ type: CreateServiceVisitQuoteDto })
  async createServiceVisitQuote(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateServiceVisitQuoteDto,
  ) {
    return this.service.createServiceVisitQuote(req.actor.organizationId, id, dto);
  }

  @Post('quotes/:id/accept')
  @RequirePermission('after_sales:issue_charge')
  @HttpCode(200)
  @ApiBody({ type: AcceptServiceVisitQuoteDto })
  async acceptServiceVisitQuote(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcceptServiceVisitQuoteDto,
  ) {
    return this.service.acceptServiceVisitQuote(
      req.actor.organizationId,
      req.actor.userId,
      id,
      dto,
    );
  }

  // ==========================================
  // MONITORAMENTO & CONECTIVIDADE
  // ==========================================

  @Get('projects/:projectId/monitoring')
  @RequirePermission('after_sales:read')
  async getMonitoringSystem(
    @Req() req: IdentityRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.service.getMonitoringSystem(req.actor.organizationId, projectId);
  }

  @Post('projects/:projectId/monitoring')
  @RequirePermission('after_sales:read')
  @HttpCode(201)
  @ApiBody({ type: CreateMonitoringSystemDto })
  async createMonitoringSystem(
    @Req() req: IdentityRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateMonitoringSystemDto,
  ) {
    return this.service.createMonitoringSystem(req.actor.organizationId, projectId, dto);
  }

  @Post('monitoring/:id/readings')
  @RequirePermission('after_sales:read')
  @HttpCode(201)
  @ApiBody({ type: RecordMonitoringReadingDto })
  async recordMonitoringReading(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordMonitoringReadingDto,
  ) {
    return this.service.recordMonitoringReading(
      req.actor.organizationId,
      id,
      req.actor.userId,
      dto,
    );
  }

  @Post('monitoring/:id/incidents')
  @RequirePermission('after_sales:read')
  @HttpCode(201)
  @ApiBody({ type: RecordConnectivityIncidentDto })
  async recordConnectivityIncident(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordConnectivityIncidentDto,
  ) {
    return this.service.recordConnectivityIncident(
      req.actor.organizationId,
      req.actor.userId,
      id,
      dto,
    );
  }

  @Patch('incidents/:id/restore')
  @RequirePermission('after_sales:read')
  @ApiBody({ type: RestoreConnectivityIncidentDto })
  async restoreConnectivityIncident(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RestoreConnectivityIncidentDto,
  ) {
    return this.service.restoreConnectivityIncident(
      req.actor.organizationId,
      req.actor.userId,
      id,
      dto,
    );
  }
}

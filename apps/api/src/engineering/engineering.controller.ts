import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EngineeringService } from './engineering.service';
import { RequirePermission, type IdentityRequest } from '../identity/identity.guard';
import {
  CreateExecutiveDesignDto,
  CreateOperationalProjectDto,
  CreateWorkOrderDto,
  RecordCustomerHandoverDto,
  UpdateChecklistItemDto,
  UpdateHomologationDto,
  UpdateOperationalProjectDto,
  UpdateWorkOrderStateDto,
} from './engineering.dto';

@ApiTags('Engenharia & Instalações')
@ApiCookieAuth('ms_access')
@Controller('engineering')
export class EngineeringController {
  constructor(private readonly service: EngineeringService) {}

  // ==========================================
  // PROJETOS OPERACIONAIS
  // ==========================================

  @Post('projects')
  @RequirePermission('engineering:create')
  @HttpCode(201)
  @ApiBody({ type: CreateOperationalProjectDto })
  async createOperationalProject(
    @Req() req: IdentityRequest,
    @Body() dto: CreateOperationalProjectDto,
  ) {
    return this.service.createOperationalProject(req.actor.organizationId, req.actor.userId, dto);
  }

  @Get('projects')
  @RequirePermission('engineering:read')
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'search', required: false })
  async listOperationalProjects(
    @Req() req: IdentityRequest,
    @Query('state') state?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listOperationalProjects(req.actor.organizationId, { state, search });
  }

  @Get('projects/:id')
  @RequirePermission('engineering:read')
  async getOperationalProject(@Req() req: IdentityRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getOperationalProject(req.actor.organizationId, id);
  }

  @Patch('projects/:id')
  @RequirePermission('engineering:update')
  @ApiBody({ type: UpdateOperationalProjectDto })
  async updateOperationalProject(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOperationalProjectDto,
  ) {
    return this.service.updateOperationalProject(
      req.actor.organizationId,
      req.actor.userId,
      id,
      dto,
    );
  }

  // ==========================================
  // PROJETO EXECUTIVO (STRINGS, MPPTS, BITOLAS)
  // ==========================================

  @Post('projects/:id/designs')
  @RequirePermission('engineering:create')
  @HttpCode(201)
  @ApiBody({ type: CreateExecutiveDesignDto })
  async createExecutiveDesign(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateExecutiveDesignDto,
  ) {
    return this.service.createExecutiveDesign(
      req.actor.organizationId,
      req.actor.userId,
      projectId,
      dto,
    );
  }

  @Post('projects/:id/designs/:designId/approve')
  @RequirePermission('engineering:approve')
  @HttpCode(200)
  async approveExecutiveDesign(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('designId', ParseUUIDPipe) designId: string,
  ) {
    return this.service.approveExecutiveDesign(
      req.actor.organizationId,
      req.actor.userId,
      projectId,
      designId,
    );
  }

  // ==========================================
  // HOMOLOGAÇÃO & CONCESSIONÁRIA
  // ==========================================

  @Put('projects/:id/homologation')
  @RequirePermission('homologation:manage')
  @HttpCode(200)
  @ApiBody({ type: UpdateHomologationDto })
  async updateHomologation(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: UpdateHomologationDto,
  ) {
    return this.service.updateHomologation(
      req.actor.organizationId,
      req.actor.userId,
      projectId,
      dto,
    );
  }

  // ==========================================
  // ORDENS DE SERVIÇO DE CAMPO
  // ==========================================

  @Post('projects/:id/work-orders')
  @RequirePermission('schedules:create')
  @HttpCode(201)
  @ApiBody({ type: CreateWorkOrderDto })
  async createWorkOrder(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateWorkOrderDto,
  ) {
    return this.service.createWorkOrder(req.actor.organizationId, req.actor.userId, projectId, dto);
  }

  @Get('work-orders')
  @RequirePermission('work_orders:read')
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'leaderId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  async listWorkOrders(
    @Req() req: IdentityRequest,
    @Query('state') state?: string,
    @Query('leaderId') leaderId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.service.listWorkOrders(req.actor.organizationId, { state, leaderId, projectId });
  }

  @Get('work-orders/:id')
  @RequirePermission('work_orders:read')
  async getWorkOrder(@Req() req: IdentityRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getWorkOrder(req.actor.organizationId, id);
  }

  @Patch('work-orders/:id/state')
  @RequirePermission('work_orders:start')
  @HttpCode(200)
  @ApiBody({ type: UpdateWorkOrderStateDto })
  async updateWorkOrderState(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkOrderStateDto,
  ) {
    return this.service.updateWorkOrderState(req.actor.organizationId, req.actor.userId, id, dto);
  }

  @Patch('checklist-items/:id')
  @RequirePermission('installations:record_materials')
  @HttpCode(200)
  @ApiBody({ type: UpdateChecklistItemDto })
  async updateChecklistItem(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.service.updateChecklistItem(req.actor.organizationId, req.actor.userId, id, dto);
  }

  // ==========================================
  // ACEITE DO CLIENTE & TERMO DE ENTREGA
  // ==========================================

  @Post('projects/:id/handover')
  @RequirePermission('installations:collect_acceptance')
  @HttpCode(200)
  @ApiBody({ type: RecordCustomerHandoverDto })
  async recordCustomerHandover(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: RecordCustomerHandoverDto,
  ) {
    return this.service.recordCustomerHandover(
      req.actor.organizationId,
      req.actor.userId,
      projectId,
      dto,
    );
  }
}

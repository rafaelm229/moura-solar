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
import { AutomationsService } from './automations.service';
import { RequirePermission, type IdentityRequest } from '../identity/identity.guard';
import {
  CreateAttentionItemDto,
  CreateAutomationRuleDto,
  CreateGoalDto,
  CreateNotificationDto,
  DiscardAttentionItemDto,
  EvaluateEventDto,
  ResolveAttentionItemDto,
  UpdateAttentionItemStatusDto,
  UpdateAutomationRuleStatusDto,
  UpdateNotificationPreferenceDto,
} from './automations.dto';

@ApiTags('Automações, Notificações, Gestão & Observabilidade')
@ApiCookieAuth('ms_access')
@Controller('automations')
export class AutomationsController {
  constructor(private readonly service: AutomationsService) {}

  // ==========================================
  // CENTRAL DE ATENÇÃO (ATTENTION ITEMS)
  // ==========================================

  @Get('attention-items')
  @RequirePermission('notifications:read_own', false)
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'kind', required: false })
  @ApiQuery({ name: 'sourceType', required: false })
  @ApiQuery({ name: 'assigneeId', required: false })
  @ApiQuery({ name: 'teamId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async listAttentionItems(
    @Req() req: IdentityRequest,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('kind') kind?: string,
    @Query('sourceType') sourceType?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('teamId') teamId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listAttentionItems(req.actor.organizationId, {
      status,
      severity,
      kind,
      sourceType,
      assigneeId,
      teamId,
      search,
    });
  }

  @Get('attention-items/:id')
  @RequirePermission('notifications:read_own', false)
  async getAttentionItem(@Req() req: IdentityRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getAttentionItem(req.actor.organizationId, id);
  }

  @Post('attention-items')
  @RequirePermission('automations:configure')
  @HttpCode(201)
  @ApiBody({ type: CreateAttentionItemDto })
  async createAttentionItem(@Req() req: IdentityRequest, @Body() dto: CreateAttentionItemDto) {
    return this.service.createOrDeduplicateAttentionItem(req.actor.organizationId, dto);
  }

  @Patch('attention-items/:id/status')
  @RequirePermission('notifications:read_own', false)
  @ApiBody({ type: UpdateAttentionItemStatusDto })
  async updateAttentionItem(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttentionItemStatusDto,
  ) {
    return this.service.updateAttentionItem(req.actor.organizationId, id, dto);
  }

  @Post('attention-items/:id/resolve')
  @RequirePermission('notifications:read_own', false)
  @HttpCode(200)
  @ApiBody({ type: ResolveAttentionItemDto })
  async resolveAttentionItem(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveAttentionItemDto,
  ) {
    return this.service.resolveAttentionItem(
      req.actor.organizationId,
      req.actor.userId,
      id,
      dto.resolutionReason,
    );
  }

  @Post('attention-items/:id/discard')
  @RequirePermission('notifications:read_own', false)
  @HttpCode(200)
  @ApiBody({ type: DiscardAttentionItemDto })
  async discardAttentionItem(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DiscardAttentionItemDto,
  ) {
    return this.service.discardAttentionItem(
      req.actor.organizationId,
      req.actor.userId,
      id,
      dto.resolutionReason,
    );
  }

  // ==========================================
  // MOTOR DE REGRAS E EXECUÇÕES (AUTOMATION ENGINE)
  // ==========================================

  @Get('rules')
  @RequirePermission('automations:configure')
  @ApiQuery({ name: 'status', required: false })
  async listRules(@Req() req: IdentityRequest, @Query('status') status?: string) {
    return this.service.listRules(req.actor.organizationId, status);
  }

  @Get('rules/:id')
  @RequirePermission('automations:configure')
  async getRule(@Req() req: IdentityRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getRule(req.actor.organizationId, id);
  }

  @Post('rules')
  @RequirePermission('automations:configure')
  @HttpCode(201)
  @ApiBody({ type: CreateAutomationRuleDto })
  async createRule(@Req() req: IdentityRequest, @Body() dto: CreateAutomationRuleDto) {
    return this.service.createRuleVersion(req.actor.organizationId, req.actor.userId, dto);
  }

  @Patch('rules/:id/status')
  @RequirePermission('automations:configure')
  @ApiBody({ type: UpdateAutomationRuleStatusDto })
  async updateRuleStatus(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAutomationRuleStatusDto,
  ) {
    return this.service.updateRuleStatus(req.actor.organizationId, id, dto.status);
  }

  @Post('events/evaluate')
  @RequirePermission('automations:configure')
  @HttpCode(200)
  @ApiBody({ type: EvaluateEventDto })
  async evaluateEvent(@Req() req: IdentityRequest, @Body() dto: EvaluateEventDto) {
    return this.service.evaluateEvent(req.actor.organizationId, dto);
  }

  @Get('executions')
  @RequirePermission('automations:configure')
  @ApiQuery({ name: 'ruleVersionId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listExecutions(
    @Req() req: IdentityRequest,
    @Query('ruleVersionId') ruleVersionId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listExecutions(req.actor.organizationId, {
      ruleVersionId,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('executions/:id/reprocess')
  @RequirePermission('automations:reprocess')
  @HttpCode(200)
  async reprocessExecution(@Req() req: IdentityRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.reprocessExecution(req.actor.organizationId, id);
  }

  // ==========================================
  // NOTIFICAÇÕES & PREFERÊNCIAS
  // ==========================================

  @Get('notifications')
  @RequirePermission('notifications:read_own', false)
  @ApiQuery({ name: 'status', required: false })
  async listNotifications(@Req() req: IdentityRequest, @Query('status') status?: string) {
    return this.service.listNotifications(req.actor.organizationId, req.actor.userId, status);
  }

  @Get('notifications/unread-count')
  @RequirePermission('notifications:read_own', false)
  async getUnreadCount(@Req() req: IdentityRequest) {
    return this.service.getUnreadCount(req.actor.organizationId, req.actor.userId);
  }

  @Patch('notifications/:id/read')
  @RequirePermission('notifications:read_own', false)
  async markNotificationRead(@Req() req: IdentityRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.markAsRead(req.actor.organizationId, req.actor.userId, id);
  }

  @Post('notifications/mark-all-read')
  @RequirePermission('notifications:read_own', false)
  @HttpCode(200)
  async markAllNotificationsRead(@Req() req: IdentityRequest) {
    return this.service.markAllAsRead(req.actor.organizationId, req.actor.userId);
  }

  @Post('notifications')
  @RequirePermission('notifications:read_own', false)
  @HttpCode(201)
  @ApiBody({ type: CreateNotificationDto })
  async createNotification(@Req() req: IdentityRequest, @Body() dto: CreateNotificationDto) {
    return this.service.createNotification(req.actor.organizationId, dto);
  }

  @Get('notification-preferences')
  @RequirePermission('notifications:read_own', false)
  async getPreferences(@Req() req: IdentityRequest) {
    return this.service.getPreferences(req.actor.organizationId, req.actor.userId);
  }

  @Put('notification-preferences')
  @RequirePermission('notifications:read_own', false)
  @ApiBody({ type: UpdateNotificationPreferenceDto })
  async updatePreference(
    @Req() req: IdentityRequest,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.service.upsertPreference(req.actor.organizationId, req.actor.userId, dto);
  }

  // ==========================================
  // METAS E INDICADORES (GOALS & METRICS)
  // ==========================================

  @Get('indicators')
  @RequirePermission('indicators:read')
  async getIndicators(@Req() req: IdentityRequest) {
    return this.service.getIndicators(req.actor.organizationId);
  }

  @Get('goals')
  @RequirePermission('indicators:read')
  @ApiQuery({ name: 'status', required: false })
  async listGoals(@Req() req: IdentityRequest, @Query('status') status?: string) {
    return this.service.listGoals(req.actor.organizationId, status);
  }

  @Post('goals')
  @RequirePermission('goals:manage')
  @HttpCode(201)
  @ApiBody({ type: CreateGoalDto })
  async createGoal(@Req() req: IdentityRequest, @Body() dto: CreateGoalDto) {
    return this.service.createGoal(req.actor.organizationId, req.actor.userId, dto);
  }

  @Post('projections/recalculate')
  @RequirePermission('goals:manage')
  @HttpCode(200)
  async recalculateProjections(@Req() req: IdentityRequest) {
    return this.service.recalculateProjections(req.actor.organizationId);
  }
}

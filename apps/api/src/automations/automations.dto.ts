import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum AttentionItemSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AttentionItemStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  DISCARDED = 'DISCARDED',
}

export enum AttentionItemKind {
  TASK = 'TASK',
  ALERT = 'ALERT',
  APPROVAL = 'APPROVAL',
  SLA_RISK = 'SLA_RISK',
  EXPIRING = 'EXPIRING',
}

export enum AttentionItemSourceType {
  OPPORTUNITY = 'OPPORTUNITY',
  PROPOSAL = 'PROPOSAL',
  CONTRACT = 'CONTRACT',
  FINANCIAL = 'FINANCIAL',
  INVENTORY = 'INVENTORY',
  ENGINEERING = 'ENGINEERING',
  AFTER_SALES = 'AFTER_SALES',
  SYSTEM = 'SYSTEM',
}

export enum AutomationRuleStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  DRAFT = 'DRAFT',
  TERMINATED = 'TERMINATED',
}

export enum AutomationExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  RETRY = 'RETRY',
  FAILED = 'FAILED',
  IGNORED = 'IGNORED',
}

export enum NotificationChannel {
  INTERNAL = 'INTERNAL',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
}

export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
}

export enum NotificationCategory {
  COMMERCIAL = 'COMMERCIAL',
  OPERATIONAL = 'OPERATIONAL',
  FINANCIAL = 'FINANCIAL',
  SYSTEM = 'SYSTEM',
}

export enum GoalScopeType {
  ORGANIZATION = 'ORGANIZATION',
  TEAM = 'TEAM',
  USER = 'USER',
}

export enum GoalStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum GoalUnit {
  BRL = 'BRL',
  COUNT = 'COUNT',
  PERCENT = 'PERCENT',
  KWH = 'KWH',
}

// ==========================================
// ATTENTION ITEMS DTOs
// ==========================================

export class CreateAttentionItemDto {
  @ApiProperty({ description: 'Tipo da origem', example: 'OPPORTUNITY' })
  @IsString()
  @IsNotEmpty()
  sourceType!: string;

  @ApiProperty({
    description: 'Identificador do objeto de origem',
    example: 'd3b07384-d113-4c91-9c32-b7e316a1c111',
  })
  @IsString()
  @IsNotEmpty()
  sourceId!: string;

  @ApiProperty({ description: 'Tipo do item', enum: AttentionItemKind, example: 'ALERT' })
  @IsString()
  @IsNotEmpty()
  kind!: string;

  @ApiPropertyOptional({
    description: 'Severidade',
    enum: AttentionItemSeverity,
    default: 'MEDIUM',
  })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiProperty({ description: 'Título da pendência ou alerta' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ description: 'Descrição detalhada e contexto acionável' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Código do motivo', example: 'COMMERCIAL_INACTIVITY_7D' })
  @IsString()
  @IsNotEmpty()
  reasonCode!: string;

  @ApiProperty({
    description: 'Chave única para agregação e deduplicação',
    example: 'opp-inactivity-d3b07384',
  })
  @IsString()
  @IsNotEmpty()
  deduplicationKey!: string;

  @ApiPropertyOptional({ description: 'Prazo limite para resolução' })
  @IsOptional()
  @IsString()
  dueAt?: string;

  @ApiPropertyOptional({ description: 'UUID do usuário responsável' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'UUID do time responsável' })
  @IsOptional()
  @IsUUID()
  teamId?: string;
}

export class UpdateAttentionItemStatusDto {
  @ApiPropertyOptional({ description: 'Novo status', enum: AttentionItemStatus })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'UUID do usuário atribuído' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'UUID do time atribuído' })
  @IsOptional()
  @IsUUID()
  teamId?: string;
}

export class ResolveAttentionItemDto {
  @ApiProperty({
    description: 'Motivo obrigatório da resolução',
    example: 'Contato realizado com cliente e agendada nova visita.',
  })
  @IsString()
  @MinLength(3)
  resolutionReason!: string;
}

export class DiscardAttentionItemDto {
  @ApiProperty({
    description: 'Motivo obrigatório do descarte justificado',
    example: 'Oportunidade foi cancelada pelo cliente por motivos pessoais.',
  })
  @IsString()
  @MinLength(3)
  resolutionReason!: string;
}

// ==========================================
// AUTOMATION RULES & EXECUTIONS DTOs
// ==========================================

export class CreateAutomationRuleDto {
  @ApiProperty({
    description: 'Identificador único da regra',
    example: 'RULE_PROPOSAL_EXPIRING_ALERT',
  })
  @IsString()
  @IsNotEmpty()
  ruleKey!: string;

  @ApiProperty({
    description: 'Nome amigável da regra',
    example: 'Alerta de Proposta Prestes a Vencer',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Descrição da regra' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Evento acionador', example: 'PROPOSAL_EXPIRING_SOON' })
  @IsString()
  @IsNotEmpty()
  triggerEvent!: string;

  @ApiPropertyOptional({
    description: 'Condições JSON para disparo',
    type: 'object',
    additionalProperties: true,
    example: { daysUntilExpiration: 3 },
  })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Ações a serem executadas',
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    example: [{ type: 'CREATE_ATTENTION_ITEM', params: { severity: 'HIGH', kind: 'ALERT' } }],
  })
  @IsOptional()
  @IsArray()
  actions?: Record<string, any>[];

  @ApiPropertyOptional({ description: 'Início da vigência' })
  @IsOptional()
  @IsString()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Término da vigência' })
  @IsOptional()
  @IsString()
  validTo?: string;

  @ApiPropertyOptional({ description: 'Fuso horário', default: 'America/Sao_Paulo' })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class UpdateAutomationRuleStatusDto {
  @ApiProperty({ description: 'Novo status da regra', enum: AutomationRuleStatus })
  @IsString()
  @IsNotEmpty()
  status!: string;
}

export class EvaluateEventDto {
  @ApiProperty({ description: 'Nome do evento de domínio', example: 'PROPOSAL_ACCEPTED' })
  @IsString()
  @IsNotEmpty()
  eventName!: string;

  @ApiPropertyOptional({ description: 'ID do evento gerador' })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiProperty({ description: 'Carga de dados do evento' })
  @IsObject()
  payload!: Record<string, any>;

  @ApiProperty({
    description: 'Chave de idempotência para garantir execução única',
    example: 'evt-prop-acc-102938',
  })
  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;

  @ApiPropertyOptional({ description: 'Trace ID para correlação de observabilidade' })
  @IsOptional()
  @IsString()
  traceId?: string;
}

// ==========================================
// NOTIFICATIONS DTOs
// ==========================================

export class CreateNotificationDto {
  @ApiProperty({ description: 'UUID do usuário destinatário' })
  @IsUUID()
  recipientId!: string;

  @ApiPropertyOptional({
    description: 'Canal de entrega',
    enum: NotificationChannel,
    default: 'INTERNAL',
  })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiProperty({ description: 'Assunto da notificação' })
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ApiProperty({ description: 'Corpo da notificação' })
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiPropertyOptional({ description: 'Metadados contextuais (mínimo, sem segredos)' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Chave de idempotência' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({ description: 'Data/hora agendada para envio' })
  @IsOptional()
  @IsString()
  scheduledAt?: string;
}

export class UpdateNotificationPreferenceDto {
  @ApiProperty({ description: 'Categoria de notificação', enum: NotificationCategory })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiProperty({ description: 'Canal', enum: NotificationChannel })
  @IsString()
  @IsNotEmpty()
  channel!: string;

  @ApiProperty({ description: 'Se ativado ou silenciado' })
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({ description: 'Início do horário silencioso (HH:MM)', example: '22:00' })
  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @ApiPropertyOptional({ description: 'Término do horário silencioso (HH:MM)', example: '07:00' })
  @IsOptional()
  @IsString()
  quietHoursEnd?: string;

  @ApiPropertyOptional({ description: 'Fuso horário', default: 'America/Sao_Paulo' })
  @IsOptional()
  @IsString()
  timezone?: string;
}

// ==========================================
// GOALS DTOs
// ==========================================

export class CreateGoalDto {
  @ApiProperty({
    description: 'Chave da métrica',
    example: 'SALES_VALUE',
  })
  @IsString()
  @IsNotEmpty()
  metricKey!: string;

  @ApiProperty({ description: 'Nome da meta', example: 'Meta de Vendas - Outubro 2026' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Escopo', enum: GoalScopeType, default: 'ORGANIZATION' })
  @IsOptional()
  @IsString()
  scopeType?: string;

  @ApiPropertyOptional({ description: 'ID do escopo (ex: UUID do time ou usuário)' })
  @IsOptional()
  @IsString()
  scopeId?: string;

  @ApiProperty({ description: 'Início do período da meta' })
  @IsString()
  @IsNotEmpty()
  periodStart!: string;

  @ApiProperty({ description: 'Término do período da meta' })
  @IsString()
  @IsNotEmpty()
  periodEnd!: string;

  @ApiProperty({ description: 'Valor alvo numérico' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  targetValue!: number;

  @ApiPropertyOptional({ description: 'Unidade da meta', enum: GoalUnit, default: 'BRL' })
  @IsOptional()
  @IsString()
  unit?: string;
}

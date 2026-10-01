import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export enum TicketType {
  ORIENTATION = 'ORIENTATION',
  CONNECTIVITY = 'CONNECTIVITY',
  INSTALLATION_WARRANTY = 'INSTALLATION_WARRANTY',
  MANUFACTURER_WARRANTY = 'MANUFACTURER_WARRANTY',
  MAINTENANCE = 'MAINTENANCE',
  EXTERNAL_EVENT = 'EXTERNAL_EVENT',
  PERFORMANCE = 'PERFORMANCE',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_TRIAGE = 'IN_TRIAGE',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  WAITING_INTERNAL = 'WAITING_INTERNAL',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELED = 'CANCELED',
  REOPENED = 'REOPENED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TicketChannel {
  WHATSAPP = 'WHATSAPP',
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  IN_PERSON = 'IN_PERSON',
  PORTAL = 'PORTAL',
  SYSTEM = 'SYSTEM',
}

export enum TicketCoverage {
  PENDING = 'PENDING',
  CONTRACT = 'CONTRACT',
  INSTALLATION = 'INSTALLATION',
  MANUFACTURER = 'MANUFACTURER',
  COURTESY = 'COURTESY',
  INSURANCE = 'INSURANCE',
  BILLABLE = 'BILLABLE',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  // Localized aliases for flexibility
  PENDENTE = 'PENDENTE',
  CONTRATO = 'CONTRATO',
  INSTALACAO = 'INSTALACAO',
  FABRICANTE = 'FABRICANTE',
  CORTESIA = 'CORTESIA',
  SEGURO = 'SEGURO',
  COBRAVEL = 'COBRAVEL',
  NAO_APLICAVEL = 'NAO_APLICAVEL',
}

export enum InteractionKind {
  NOTE = 'NOTE',
  MESSAGE = 'MESSAGE',
  REMOTE_GUIDANCE = 'REMOTE_GUIDANCE',
  STATUS_CHANGE = 'STATUS_CHANGE',
  EVIDENCE = 'EVIDENCE',
}

export enum InteractionVisibility {
  INTERNAL = 'INTERNAL',
  PUBLIC = 'PUBLIC',
}

export enum WarrantyKind {
  INSTALLATION = 'INSTALLATION',
  INVERTER = 'INVERTER',
  MODULE = 'MODULE',
  STRUCTURE = 'STRUCTURE',
  ELECTRICAL = 'ELECTRICAL',
}

export enum WarrantyProviderType {
  INSTALLER = 'INSTALLER',
  MANUFACTURER = 'MANUFACTURER',
  DISTRIBUTOR = 'DISTRIBUTOR',
}

export enum ClaimStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RMA = 'RMA',
  REPLACED = 'REPLACED',
  CLOSED = 'CLOSED',
}

export enum MonitoringConnectionType {
  WIFI = 'WIFI',
  ETHERNET = 'ETHERNET',
  FOUR_G = '4G',
  RS485 = 'RS485',
}

export enum ReadingSource {
  INFORMADA = 'INFORMADA',
  IMPORTADA = 'IMPORTADA',
  ESTIMADA = 'ESTIMADA',
  VALIDADA = 'VALIDADA',
}

export class CreateSupportTicketDto {
  @ApiProperty({ description: 'ID do Cliente' })
  @IsUUID()
  @IsNotEmpty()
  customerId!: string;

  @ApiPropertyOptional({ description: 'ID do Projeto Operacional (se houver)' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiProperty({ enum: TicketType, description: 'Tipo de atendimento' })
  @IsEnum(TicketType)
  @IsNotEmpty()
  type!: TicketType;

  @ApiPropertyOptional({
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
    description: 'Prioridade do chamado',
  })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @ApiPropertyOptional({
    enum: TicketChannel,
    default: TicketChannel.WHATSAPP,
    description: 'Canal de entrada',
  })
  @IsEnum(TicketChannel)
  @IsOptional()
  channel?: TicketChannel;

  @ApiProperty({ description: 'Título / Resumo do Chamado' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Descrição detalhada do relato do cliente' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({ enum: TicketCoverage, description: 'Cobertura provável inicial' })
  @IsEnum(TicketCoverage)
  @IsOptional()
  probableCoverage?: TicketCoverage;
}

export class TriageSupportTicketDto {
  @ApiPropertyOptional({ enum: TicketCoverage, description: 'Cobertura confirmada após análise' })
  @IsEnum(TicketCoverage)
  @IsOptional()
  confirmedCoverage?: TicketCoverage;

  @ApiPropertyOptional({ description: 'Causa raiz identificada' })
  @IsString()
  @IsOptional()
  rootCause?: string;

  @ApiPropertyOptional({ description: 'ID do usuário responsável' })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'ID da equipe responsável' })
  @IsUUID()
  @IsOptional()
  assignedTeamId?: string;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;
}

export class UpdateSupportTicketStatusDto {
  @ApiProperty({ enum: TicketStatus, description: 'Novo estado do chamado' })
  @IsEnum(TicketStatus)
  @IsNotEmpty()
  status!: TicketStatus;

  @ApiPropertyOptional({ description: 'Resumo da solução técnica adotada' })
  @IsString()
  @IsOptional()
  resolutionSummary?: string;

  @ApiPropertyOptional({ description: 'Avaliação de satisfação do cliente (1 a 5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  satisfactionRating?: number;
}

export class CreateSupportInteractionDto {
  @ApiProperty({ enum: InteractionKind, description: 'Tipo de interação' })
  @IsEnum(InteractionKind)
  @IsNotEmpty()
  kind!: InteractionKind;

  @ApiPropertyOptional({
    enum: InteractionVisibility,
    default: InteractionVisibility.INTERNAL,
    description: 'Visibilidade da nota',
  })
  @IsEnum(InteractionVisibility)
  @IsOptional()
  visibility?: InteractionVisibility;

  @ApiProperty({ description: 'Conteúdo da interação ou orientação prestada' })
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiPropertyOptional({ description: 'URL de anexo ou evidência' })
  @IsString()
  @IsOptional()
  attachmentUrl?: string;
}

export class CreateWarrantyCoverageDto {
  @ApiProperty({ enum: WarrantyKind, description: 'Tipo da garantia' })
  @IsEnum(WarrantyKind)
  @IsNotEmpty()
  kind!: WarrantyKind;

  @ApiProperty({ enum: WarrantyProviderType, description: 'Tipo do provedor' })
  @IsEnum(WarrantyProviderType)
  @IsNotEmpty()
  providerType!: WarrantyProviderType;

  @ApiProperty({ description: 'Nome do provedor (ex: Moura Solar, Solis, Canadian Solar)' })
  @IsString()
  @IsNotEmpty()
  providerName!: string;

  @ApiPropertyOptional({ description: 'Modelo do equipamento coberto' })
  @IsString()
  @IsOptional()
  itemModel?: string;

  @ApiPropertyOptional({ description: 'Número de série coberto' })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiProperty({ description: 'Data de início da vigência (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  startsAt!: string;

  @ApiProperty({ description: 'Data de término da vigência (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  endsAt!: string;

  @ApiPropertyOptional({ description: 'Termos e condições resumidos' })
  @IsString()
  @IsOptional()
  terms?: string;
}

export class CreateWarrantyClaimDto {
  @ApiProperty({ description: 'ID da cobertura de garantia vinculada' })
  @IsUUID()
  @IsNotEmpty()
  coverageId!: string;

  @ApiPropertyOptional({ description: 'ID do fornecedor/fabricante' })
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @ApiProperty({ description: 'Descrição da falha constatada' })
  @IsString()
  @IsNotEmpty()
  failureDescription!: string;

  @ApiPropertyOptional({ description: 'Protocolo de abertura com o fabricante' })
  @IsString()
  @IsOptional()
  protocolNumber?: string;
}

export class UpdateWarrantyClaimDto {
  @ApiProperty({ enum: ClaimStatus, description: 'Status do sinistro/RMA' })
  @IsEnum(ClaimStatus)
  @IsNotEmpty()
  status!: ClaimStatus;

  @ApiPropertyOptional({ description: 'Código RMA gerado pelo fabricante' })
  @IsString()
  @IsOptional()
  rmaCode?: string;

  @ApiPropertyOptional({ description: 'Número de série da peça substituta' })
  @IsString()
  @IsOptional()
  replacementSerial?: string;

  @ApiPropertyOptional({ description: 'Valor de custos reembolsados pelo fabricante' })
  @IsNumber()
  @IsOptional()
  costsReimbursed?: number;
}

export class CreateServiceVisitQuoteDto {
  @ApiProperty({ description: 'Valor de mão de obra / serviço técnico' })
  @IsNumber()
  @Min(0)
  laborAmount!: number;

  @ApiProperty({ description: 'Taxa de deslocamento / km' })
  @IsNumber()
  @Min(0)
  displacementAmount!: number;

  @ApiPropertyOptional({
    description: 'Valor de materiais adicionais fora de garantia',
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  materialsAmount?: number;

  @ApiPropertyOptional({ description: 'Desconto comercial concedido', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discountAmount?: number;

  @ApiProperty({ description: 'Data limite de validade do orçamento (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  validUntil!: string;

  @ApiPropertyOptional({ description: 'Observações do orçamento' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class AcceptServiceVisitQuoteDto {
  @ApiProperty({ description: 'Nome do responsável pelo aceite' })
  @IsString()
  @IsNotEmpty()
  acceptedBy!: string;

  @ApiPropertyOptional({ description: 'Evidência do aceite (link, WhatsApp, assinatura digital)' })
  @IsString()
  @IsOptional()
  acceptanceEvidence?: string;
}

export class CreateMonitoringSystemDto {
  @ApiProperty({
    description: 'Provedor da telemetria (ex: SolisCloud, Deye Cloud, Huawei, Manual)',
  })
  @IsString()
  @IsNotEmpty()
  provider!: string;

  @ApiPropertyOptional({ description: 'ID da usina no portal do fabricante' })
  @IsString()
  @IsOptional()
  externalPlantId?: string;

  @ApiPropertyOptional({
    enum: MonitoringConnectionType,
    default: MonitoringConnectionType.WIFI,
    description: 'Tipo de conexão',
  })
  @IsString()
  @IsOptional()
  connectionType?: string;

  @ApiPropertyOptional({ description: 'Modelo do inversor / datalogger' })
  @IsString()
  @IsOptional()
  inverterModel?: string;

  @ApiPropertyOptional({ description: 'Observações de conectividade' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RecordMonitoringReadingDto {
  @ApiProperty({ description: 'Competência no formato YYYY-MM' })
  @IsString()
  @IsNotEmpty()
  period!: string;

  @ApiProperty({ description: 'Geração esperada em kWh' })
  @IsNumber()
  @Min(0)
  expectedGenerationKwh!: number;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description:
      'Geração real apurada em kWh. Deixar nulo se não houver telemetria (não enviar zero!).',
  })
  @IsNumber()
  @IsOptional()
  realizedGenerationKwh?: number | null;

  @ApiPropertyOptional({
    enum: ReadingSource,
    default: ReadingSource.INFORMADA,
    description: 'Origem da leitura',
  })
  @IsEnum(ReadingSource)
  @IsOptional()
  source?: ReadingSource;

  @ApiPropertyOptional({ description: 'Observações da leitura' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RecordConnectivityIncidentDto {
  @ApiPropertyOptional({ description: 'ID do chamado relacionado' })
  @IsUUID()
  @IsOptional()
  ticketId?: string;

  @ApiPropertyOptional({
    description: 'Causa provável (ex: Troca de roteador/provedor de internet)',
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Cliente trocou rede Wi-Fi/provedor?', default: false })
  @IsBoolean()
  @IsOptional()
  customerNetworkChanged?: boolean;
}

export class RestoreConnectivityIncidentDto {
  @ApiProperty({
    description: 'Método de resolução (ex: Roteiro remoto via WPS aplicado com sucesso)',
  })
  @IsString()
  @IsNotEmpty()
  resolutionMethod!: string;
}

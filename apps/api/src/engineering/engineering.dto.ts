import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProjectOperationalState {
  PREPARATION = 'PREPARATION',
  ENGINEERING = 'ENGINEERING',
  HOMOLOGATION = 'HOMOLOGATION',
  SUPPLY = 'SUPPLY',
  READY_TO_SCHEDULE = 'READY_TO_SCHEDULE',
  SCHEDULED = 'SCHEDULED',
  INSTALLING = 'INSTALLING',
  COMMISSIONING = 'COMMISSIONING',
  DELIVERY = 'DELIVERY',
  AFTER_SALES = 'AFTER_SALES',
  CLOSED = 'CLOSED',
  SUSPENDED = 'SUSPENDED',
  CANCELED = 'CANCELED',
}

export enum ExecutiveDesignStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  SUPERSEDED = 'SUPERSEDED',
}

export enum HomologationStage {
  PREPARING = 'PREPARING',
  SUBMITTED = 'SUBMITTED',
  PENDING_INFORMATION = 'PENDING_INFORMATION',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  METER_EXCHANGE_PENDING = 'METER_EXCHANGE_PENDING',
  METER_EXCHANGED = 'METER_EXCHANGED',
  COMPLETED = 'COMPLETED',
}

export enum WorkOrderState {
  DRAFT = 'DRAFT',
  READY = 'READY',
  ASSIGNED = 'ASSIGNED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

export enum ChecklistSection {
  PREPARATION = 'PREPARATION',
  SAFETY_ARRIVAL = 'SAFETY_ARRIVAL',
  EQUIPMENT = 'EQUIPMENT',
  EXECUTION = 'EXECUTION',
  COMMISSIONING = 'COMMISSIONING',
  DELIVERY = 'DELIVERY',
}

export enum ChecklistItemStatus {
  PENDING = 'PENDING',
  OK = 'OK',
  NOK = 'NOK',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export class CreateOperationalProjectDto {
  @ApiProperty({ example: 'b0e00888-c774-4b47-ba21-863a566580ec' })
  @IsUUID()
  opportunityId!: string;

  @ApiProperty({ example: 'PRJ-2026-0001' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 'Instalação Solar Residencial 7.2 kWp' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: 'b0e00888-c774-4b47-ba21-863a566580ec' })
  @IsUUID()
  @IsOptional()
  engineerUserId?: string;

  @ApiPropertyOptional({ example: 7.2 })
  @IsNumber()
  @IsOptional()
  nominalPowerKw?: number;

  @ApiPropertyOptional({ example: 950 })
  @IsNumber()
  @IsOptional()
  estimatedMonthlyGenerationKwh?: number;

  @ApiPropertyOptional({ example: 'ART-2026-887412' })
  @IsString()
  @IsOptional()
  artNumber?: string;

  @ApiPropertyOptional({ example: 'Telhado cerâmico colonial, orientação Norte.' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateOperationalProjectDto {
  @ApiPropertyOptional({
    enum: ProjectOperationalState,
    example: ProjectOperationalState.ENGINEERING,
  })
  @IsEnum(ProjectOperationalState)
  @IsOptional()
  state?: ProjectOperationalState;

  @ApiPropertyOptional({ example: 'b0e00888-c774-4b47-ba21-863a566580ec' })
  @IsUUID()
  @IsOptional()
  engineerUserId?: string;

  @ApiPropertyOptional({ example: 'ART-2026-887412' })
  @IsString()
  @IsOptional()
  artNumber?: string;

  @ApiPropertyOptional({ example: 'Observações de engenharia e telhado.' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateExecutiveDesignDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  stringsCount!: number;

  @ApiProperty({ example: 8 })
  @IsInt()
  @Min(1)
  modulesPerString!: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  mpptCount!: number;

  @ApiPropertyOptional({ example: 18.5 })
  @IsNumber()
  @IsOptional()
  tiltDegrees?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  azimuthDegrees?: number;

  @ApiPropertyOptional({ example: 6 })
  @IsNumber()
  @IsOptional()
  cableGaugeMm?: number;

  @ApiPropertyOptional({ example: 'https://docs.moura-solar.test/diagrams/prj-1.pdf' })
  @IsString()
  @IsOptional()
  diagramUrl?: string;

  @ApiPropertyOptional({ example: 'Configuração em 2 strings de 8 módulos no MPPT 1 e 2.' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateHomologationDto {
  @ApiProperty({ example: 'CEMIG Distribuição S.A.' })
  @IsString()
  @IsNotEmpty()
  distributor!: string;

  @ApiPropertyOptional({ example: 'PROT-CEMIG-2026-9988' })
  @IsString()
  @IsOptional()
  protocolNumber?: string;

  @ApiProperty({ enum: HomologationStage, example: HomologationStage.SUBMITTED })
  @IsEnum(HomologationStage)
  stage!: HomologationStage;

  @ApiPropertyOptional({ example: '2026-10-15' })
  @IsString()
  @IsOptional()
  deadlineAt?: string;

  @ApiPropertyOptional({ example: 'Projeto submetido no portal da concessionária.' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateWorkOrderChecklistInputDto {
  @ApiProperty({ enum: ChecklistSection, example: ChecklistSection.PREPARATION })
  @IsEnum(ChecklistSection)
  section!: ChecklistSection;

  @ApiProperty({ example: 'EPI-01' })
  @IsString()
  @IsNotEmpty()
  itemCode!: string;

  @ApiProperty({ example: 'Conferência de EPIs da equipe' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: 'CHECK' })
  @IsString()
  @IsOptional()
  responseType?: string;
}

export class CreateWorkOrderDto {
  @ApiProperty({ example: 'OS-2026-0001' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 'Instalação Física e Conexão Elétrica' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: '2026-10-10' })
  @IsString()
  @IsOptional()
  scheduledDate?: string;

  @ApiPropertyOptional({ example: '2026-10-11' })
  @IsString()
  @IsOptional()
  scheduledEndDate?: string;

  @ApiPropertyOptional({ example: 'b0e00888-c774-4b47-ba21-863a566580ec' })
  @IsUUID()
  @IsOptional()
  assignedLeaderId?: string;

  @ApiPropertyOptional({ example: 'b0e00888-c774-4b47-ba21-863a566580ec' })
  @IsUUID()
  @IsOptional()
  assignedTeamId?: string;

  @ApiPropertyOptional({ example: 'ABC-1234' })
  @IsString()
  @IsOptional()
  vehiclePlate?: string;

  @ApiPropertyOptional({ type: [CreateWorkOrderChecklistInputDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkOrderChecklistInputDto)
  checklistItems?: CreateWorkOrderChecklistInputDto[];
}

export class UpdateWorkOrderStateDto {
  @ApiProperty({ enum: WorkOrderState, example: WorkOrderState.IN_PROGRESS })
  @IsEnum(WorkOrderState)
  state!: WorkOrderState;

  @ApiPropertyOptional({ example: 'CLIMA' })
  @IsString()
  @IsOptional()
  pauseReason?: string;

  @ApiPropertyOptional({ example: 'Chuva torrencial no local impossibilitando subida no telhado.' })
  @IsString()
  @IsOptional()
  pauseNotes?: string;
}

export class UpdateChecklistItemDto {
  @ApiProperty({ enum: ChecklistItemStatus, example: ChecklistItemStatus.OK })
  @IsEnum(ChecklistItemStatus)
  status!: ChecklistItemStatus;

  @ApiPropertyOptional({ example: 450.5 })
  @IsNumber()
  @IsOptional()
  measurementValue?: number;

  @ApiPropertyOptional({
    example: 'Tensão de circuito aberto (Voc) aferida em 450.5 V, dentro do esperado.',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 'https://storage.moura-solar.test/photos/os-1-voc.jpg' })
  @IsString()
  @IsOptional()
  photoUrl?: string;
}

export class RecordCustomerHandoverDto {
  @ApiProperty({ example: 'Carlos Alberto Silva' })
  @IsString()
  @IsNotEmpty()
  clientName!: string;

  @ApiPropertyOptional({ example: '123.456.789-00' })
  @IsString()
  @IsOptional()
  clientDocument?: string;

  @ApiPropertyOptional({ example: 6.8 })
  @IsNumber()
  @IsOptional()
  generationVerifiedKw?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  satisfactionRating?: number;

  @ApiPropertyOptional({ example: 'CONFIRMED_VIA_TOUCH_SIGNATURE' })
  @IsString()
  @IsOptional()
  signatureData?: string;

  @ApiPropertyOptional({
    example: 'Cliente instruído sobre aplicativo do inversor e desligamento de emergência.',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

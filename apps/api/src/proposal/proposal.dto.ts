import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export enum ProposalDeliveryChannel {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  DOWNLOAD = 'DOWNLOAD',
  IN_PERSON = 'IN_PERSON',
  MANUAL = 'MANUAL',
}

export enum ProposalAcceptanceMethod {
  SIGNED_DOCUMENT = 'SIGNED_DOCUMENT',
  MESSAGE = 'MESSAGE',
  IN_PERSON = 'IN_PERSON',
  E_SIGNATURE = 'E_SIGNATURE',
}

export class CreateProposalDto {
  @ApiProperty({ description: 'ID da oportunidade comercial' })
  @IsUUID()
  @IsNotEmpty()
  opportunityId!: string;

  @ApiProperty({ description: 'ID da versão aprovada de dimensionamento' })
  @IsUUID()
  @IsNotEmpty()
  designVersionId!: string;

  @ApiPropertyOptional({ description: 'Dias de validade da proposta (padrão 10)', default: 10 })
  @IsInt()
  @Min(1)
  @Max(90)
  @IsOptional()
  validityDays?: number;

  @ApiPropertyOptional({ description: 'Condições de pagamento e parcelamento' })
  @IsObject()
  @IsOptional()
  paymentConditions?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Observações comerciais visíveis na proposta' })
  @IsString()
  @IsOptional()
  observations?: string;
}

export class UpdateProposalDraftDto {
  @ApiProperty({ description: 'Versão esperada do registro para controle de concorrência' })
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @ApiPropertyOptional({ description: 'Dias de validade da proposta (padrão 10)' })
  @IsInt()
  @Min(1)
  @Max(90)
  @IsOptional()
  validityDays?: number;

  @ApiPropertyOptional({ description: 'Condições de pagamento e parcelamento' })
  @IsObject()
  @IsOptional()
  paymentConditions?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Observações comerciais' })
  @IsString()
  @IsOptional()
  observations?: string;
}

export class RecordProposalDeliveryDto {
  @ApiProperty({
    enum: ProposalDeliveryChannel,
    description: 'Canal utilizado para envio da proposta comercial',
  })
  @IsEnum(ProposalDeliveryChannel)
  @IsNotEmpty()
  channel!: ProposalDeliveryChannel;

  @ApiPropertyOptional({ description: 'Destinatário do envio (e-mail, número WhatsApp, etc.)' })
  @IsString()
  @IsOptional()
  recipient?: string;

  @ApiPropertyOptional({ description: 'Notas ou observações sobre o envio' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RecordProposalAcceptanceDto {
  @ApiProperty({
    enum: ProposalAcceptanceMethod,
    description: 'Forma pela qual o aceite do cliente foi confirmado',
  })
  @IsEnum(ProposalAcceptanceMethod)
  @IsNotEmpty()
  method!: ProposalAcceptanceMethod;

  @ApiProperty({ description: 'Nome da pessoa responsável pelo aceite no cliente' })
  @IsString()
  @IsNotEmpty()
  acceptedByName!: string;

  @ApiPropertyOptional({ description: 'Observações sobre o aceite ou evidência anexada' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RecordProposalRejectionDto {
  @ApiProperty({ description: 'Motivo da recusa da proposta comercial pelo cliente' })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiPropertyOptional({ description: 'Observações complementares da recusa' })
  @IsString()
  @IsOptional()
  notes?: string;
}

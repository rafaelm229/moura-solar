import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export enum ContractDeliveryChannel {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  DOWNLOAD = 'DOWNLOAD',
  IN_PERSON = 'IN_PERSON',
  MANUAL = 'MANUAL',
}

export enum SignedReviewDecision {
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export class CreateContractDto {
  @ApiProperty({ description: 'ID da oportunidade comercial' })
  @IsUUID()
  @IsNotEmpty()
  opportunityId!: string;

  @ApiPropertyOptional({
    description:
      'ID da versão da proposta aceita (se omitido, busca automaticamente a aceita na oportunidade)',
  })
  @IsUUID()
  @IsOptional()
  acceptedProposalVersionId?: string;

  @ApiPropertyOptional({ description: 'Cidade de assinatura do contrato', default: 'Recife' })
  @IsString()
  @IsOptional()
  signingCity?: string;

  @ApiPropertyOptional({ description: 'Observações ou condições comerciais especiais' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Tipo de telhado/superfície para instalação' })
  @IsString()
  @IsOptional()
  roofType?: string;
}

export class UpdateContractDraftDto {
  @ApiPropertyOptional({ description: 'Snapshot ou ajustes das partes envolvidas' })
  @IsObject()
  @IsOptional()
  partySnapshot?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Snapshot ou ajustes das especificações técnicas' })
  @IsObject()
  @IsOptional()
  technicalSnapshot?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Snapshot ou ajustes das condições financeiras e parcelamento',
  })
  @IsObject()
  @IsOptional()
  commercialSnapshot?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Snapshot do escopo e inclusões/exclusões' })
  @IsObject()
  @IsOptional()
  scopeSnapshot?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Snapshot das cláusulas e termos' })
  @IsObject()
  @IsOptional()
  clausesSnapshot?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Observações gerais' })
  @IsString()
  @IsOptional()
  observations?: string;
}

export class RequestContractReviewDto {
  @ApiPropertyOptional({
    description: 'Justificativa para a solicitação de revisão jurídica/comercial',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ApproveContractDto {
  @ApiPropertyOptional({ description: 'Notas da aprovação' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RecordContractDeliveryDto {
  @ApiProperty({
    description: 'Canal de envio do contrato ao cliente',
    enum: ContractDeliveryChannel,
    example: ContractDeliveryChannel.WHATSAPP,
  })
  @IsEnum(ContractDeliveryChannel)
  @IsNotEmpty()
  channel!: ContractDeliveryChannel;

  @ApiPropertyOptional({
    description: 'Destinatário (número de WhatsApp, e-mail ou nome)',
    example: '5581999998888',
  })
  @IsString()
  @IsOptional()
  recipient?: string;

  @ApiPropertyOptional({ description: 'Observações sobre o envio' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UploadSignedContractDto {
  @ApiProperty({ description: 'Nome do arquivo enviado', example: 'contrato-assinado-cliente.pdf' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[\w\-. ]+\.pdf$/i, {
    message:
      'O nome do arquivo deve terminar em .pdf e não conter caracteres especiais ou caminhos relativos.',
  })
  fileName!: string;

  @ApiProperty({ description: 'Conteúdo do arquivo codificado em Base64' })
  @IsString()
  @IsNotEmpty()
  fileBase64!: string;

  @ApiPropertyOptional({ description: 'Tipo MIME do arquivo', default: 'application/pdf' })
  @IsString()
  @IsOptional()
  @Matches(/^application\/pdf$/i, {
    message: 'O tipo MIME deve ser application/pdf.',
  })
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Observações sobre o arquivo assinado' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class VerifySignedContractDto {
  @ApiProperty({ description: 'Confirmação se os dados das partes conferem com o cadastro' })
  @IsBoolean()
  partiesMatch!: boolean;

  @ApiProperty({ description: 'Confirmação se todas as páginas e anexos estão presentes' })
  @IsBoolean()
  allPagesPresent!: boolean;

  @ApiProperty({ description: 'Confirmação se o modelo e versão correspondem ao gerado' })
  @IsBoolean()
  versionMatches!: boolean;

  @ApiProperty({ description: 'Confirmação se as assinaturas e rubricas estão legíveis' })
  @IsBoolean()
  signaturesLegible!: boolean;

  @ApiProperty({
    description: 'Decisão da conferência formal',
    enum: SignedReviewDecision,
    example: SignedReviewDecision.VERIFIED,
  })
  @IsEnum(SignedReviewDecision)
  @IsNotEmpty()
  decision!: SignedReviewDecision;

  @ApiPropertyOptional({ description: 'Motivo da rejeição caso não aprovado' })
  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Notas da conferência' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateAmendmentDto {
  @ApiProperty({ description: 'Motivo do aditivo contratual' })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiPropertyOptional({ description: 'Alterações estruturadas introduzidas pelo aditivo' })
  @IsObject()
  @IsOptional()
  changes?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Observações do aditivo' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CancelContractDto {
  @ApiProperty({ description: 'Motivo do cancelamento do contrato' })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiPropertyOptional({ description: 'Observações adicionais' })
  @IsString()
  @IsOptional()
  notes?: string;
}

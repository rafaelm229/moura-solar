import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export type Actor = {
  userId: string;
  organizationId: string;
};

export const DOSSIER_CATEGORIES = [
  'IDENTITY',
  'CORPORATE',
  'REPRESENTATION',
  'UTILITY_BILL',
  'UC_DOCUMENT',
  'COMMERCIAL_PROPOSAL',
  'CONTRACT_ANNEX',
  'PHOTO_BEFORE',
  'PHOTO_DURING',
  'PHOTO_AFTER',
  'ART',
  'HOMOLOGATION',
  'DELIVERY_REPORT',
  'OTHER',
] as const;

export type DossierCategory = (typeof DOSSIER_CATEGORIES)[number];

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export class CreateDocumentUploadDto {
  @ApiProperty({ description: 'Título identificador do documento no dossiê', example: 'Conta Cemig - Jan/2026' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @ApiProperty({
    description: 'Categoria documental no dossiê',
    enum: DOSSIER_CATEGORIES,
    example: 'UTILITY_BILL',
  })
  @IsString()
  @IsIn(DOSSIER_CATEGORIES)
  category!: DossierCategory;

  @ApiProperty({ description: 'Nome original do arquivo enviado', example: 'conta-cemig-jan2026.pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({
    description: 'MIME type declarado pelo cliente',
    enum: ALLOWED_MIME_TYPES,
    example: 'application/pdf',
  })
  @IsString()
  @IsIn(ALLOWED_MIME_TYPES)
  declaredMime!: string;

  @ApiProperty({ description: 'Tamanho do arquivo em bytes (máximo 20 MiB)', example: 1048576 })
  @IsNumber()
  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024)
  fileSize!: number;

  @ApiPropertyOptional({ description: 'Hash SHA-256 do arquivo se já computado' })
  @IsOptional()
  @IsString()
  sha256?: string;

  @ApiPropertyOptional({ description: 'Finalidade específica do documento' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  purpose?: string;

  @ApiPropertyOptional({ description: 'Conteúdo em base64 (para upload direto via API)' })
  @IsOptional()
  @IsString()
  fileBase64?: string;

  @ApiPropertyOptional({ description: 'ID da Unidade Consumidora vinculada' })
  @IsOptional()
  @IsUUID()
  utilityUnitId?: string;

  @ApiPropertyOptional({ description: 'ID da Oportunidade vinculada' })
  @IsOptional()
  @IsUUID()
  opportunityId?: string;

  @ApiPropertyOptional({ description: 'ID do Projeto Operacional vinculado' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'ID do Representante vinculado' })
  @IsOptional()
  @IsUUID()
  representativeId?: string;

  @ApiPropertyOptional({ description: 'ID do Contrato vinculado' })
  @IsOptional()
  @IsUUID()
  contractId?: string;

  @ApiPropertyOptional({ description: 'ID da Ordem de Serviço vinculada' })
  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @ApiPropertyOptional({ description: 'Fase da foto de execução (BEFORE, DURING, AFTER)' })
  @IsOptional()
  @IsString()
  @IsIn(['BEFORE', 'DURING', 'AFTER'])
  phase?: string;
}

export class CompleteUploadDto {
  @ApiPropertyOptional({ description: 'Versão esperada para verificação concorrente' })
  @IsOptional()
  @IsInt()
  expectedVersion?: number;

  @ApiPropertyOptional({ description: 'Conteúdo em base64 se enviado na conclusão' })
  @IsOptional()
  @IsString()
  fileBase64?: string;
}

export class CustomerRepresentativeDto {
  @ApiProperty({ description: 'Nome do representante legal/técnico', example: 'Carlos Alberto Silva' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ description: 'CPF ou CNPJ do representante' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  documentNumber?: string;

  @ApiProperty({
    description: 'Papel do representante',
    enum: ['LEGAL_REPRESENTATIVE', 'ATTORNEY', 'TECHNICAL_RESPONSIBLE', 'FINANCIAL_CONTACT', 'OTHER'],
    example: 'LEGAL_REPRESENTATIVE',
  })
  @IsString()
  @IsIn(['LEGAL_REPRESENTATIVE', 'ATTORNEY', 'TECHNICAL_RESPONSIBLE', 'FINANCIAL_CONTACT', 'OTHER'])
  role!: string;
}

export class RepresentativeViewDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  documentNumber?: string | null;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class DossierVersionViewDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  versionNumber!: number;

  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  fileSize!: number;

  @ApiProperty()
  declaredMime!: string;

  @ApiPropertyOptional()
  verifiedMime?: string | null;

  @ApiProperty()
  sha256!: string;

  @ApiProperty()
  persistenceState!: string;

  @ApiProperty()
  createdAt!: string;
}

export class DossierDocumentLinksDto {
  @ApiProperty({ type: [String] })
  utilityUnitIds!: string[];

  @ApiProperty({ type: [String] })
  opportunityIds!: string[];

  @ApiProperty({ type: [String] })
  projectIds!: string[];

  @ApiProperty({ type: [String] })
  representativeIds!: string[];

  @ApiProperty({ type: [String] })
  contractIds!: string[];
}

export class DossierDocumentViewDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['DOSSIER', 'PROPOSAL_DOCUMENT', 'CONTRACT_DOCUMENT'] })
  origin!: 'DOSSIER' | 'PROPOSAL_DOCUMENT' | 'CONTRACT_DOCUMENT';

  @ApiProperty()
  category!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  purpose?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty()
  createdBy!: string;

  @ApiPropertyOptional({ type: DossierVersionViewDto })
  currentVersion?: DossierVersionViewDto | null;

  @ApiProperty({ type: DossierDocumentLinksDto })
  links!: DossierDocumentLinksDto;
}

export class ArchiveDocumentDto {
  @ApiPropertyOptional({ description: 'Motivo do arquivamento do documento' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

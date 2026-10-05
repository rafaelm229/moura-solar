import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateEnergyBillImportDto {
  @ApiProperty({ description: 'Versão imutável e READY da conta no dossiê.' })
  @IsUUID()
  documentVersionId!: string;

  @ApiPropertyOptional({ description: 'UC existente do mesmo cliente, quando selecionada.' })
  @IsOptional()
  @IsUUID()
  utilityUnitId?: string;

  @ApiPropertyOptional({
    description: 'Oportunidade vinculada ao mesmo cliente, quando selecionada.',
  })
  @IsOptional()
  @IsUUID()
  opportunityId?: string;
}

export class EnergyBillImportViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() organizationId!: string;
  @ApiProperty() customerId!: string;
  @ApiProperty({ type: String, nullable: true }) utilityUnitId!: string | null;
  @ApiProperty({ type: String, nullable: true }) opportunityId!: string | null;
  @ApiProperty() documentVersionId!: string;
  @ApiProperty({
    enum: [
      'QUEUED',
      'PROCESSING',
      'REVIEW_REQUIRED',
      'CONFIRMING',
      'APPLIED',
      'FAILED',
      'CANCELED',
    ],
  })
  status!: string;
  @ApiProperty() version!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ type: String, nullable: true }) appliedAt!: string | null;
  @ApiPropertyOptional({ type: Object }) latestReview?: Record<string, unknown>;
  @ApiPropertyOptional({ type: Object }) applicationReceipt?: Record<string, unknown>;
}

export class ImportMonthDecisionDto {
  @ApiProperty({ example: '2026-08' })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  referenceMonth!: string;

  @ApiProperty({ enum: ['KEEP', 'INSERT', 'REPLACE'] })
  @IsIn(['KEEP', 'INSERT', 'REPLACE'])
  decision!: 'KEEP' | 'INSERT' | 'REPLACE';

  @ApiPropertyOptional({ nullable: true, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedReadingVersion?: number | null;

  @ApiPropertyOptional({ example: '421.50' })
  @IsOptional()
  @IsString()
  @Matches(/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/)
  consumptionKwh?: string;

  @ApiPropertyOptional({ example: '16.25', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/)
  injectedKwh?: string | null;

  @ApiPropertyOptional({ example: '384.92', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/)
  billedAmount?: string | null;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ReviewEnergyBillImportDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @ApiProperty({ type: [ImportMonthDecisionDto], minItems: 1, maxItems: 36 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(36)
  @ArrayUnique((item: ImportMonthDecisionDto) => item.referenceMonth)
  @ValidateNested({ each: true })
  @Type(() => ImportMonthDecisionDto)
  months!: ImportMonthDecisionDto[];
}

export class ConfirmEnergyBillImportDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @ApiProperty() @IsUUID() reviewId!: string;
  @ApiProperty() @IsString() @Matches(/^[a-f0-9]{64}$/) reviewDigest!: string;
}

export class EnergyBillImportLifecycleDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @ApiProperty({ minLength: 3, maxLength: 500 })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class AppliedEnergyReadingDto {
  @ApiProperty() referenceMonth!: string;
  @ApiProperty() readingId!: string;
  @ApiProperty() version!: number;
}

export class EnergyBillImportReceiptDto {
  @ApiProperty({ enum: ['APPLIED'] }) status!: 'APPLIED';
  @ApiProperty() importId!: string;
  @ApiProperty() reviewId!: string;
  @ApiProperty() reviewDigest!: string;
  @ApiProperty() appliedAt!: string;
  @ApiProperty() utilityUnitId!: string;
  @ApiProperty({ type: [AppliedEnergyReadingDto] })
  readingChanges!: AppliedEnergyReadingDto[];
  @ApiProperty({ type: [String] }) warnings!: string[];
}

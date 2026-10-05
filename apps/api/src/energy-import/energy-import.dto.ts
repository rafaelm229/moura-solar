import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

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
}

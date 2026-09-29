import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEnergyReadingDto {
  @ApiProperty({ example: '2026-08' })
  @IsString()
  referenceMonth!: string;

  @ApiProperty({ example: 450.5 })
  @IsNumber()
  @Min(0)
  consumptionKwh!: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  injectedKwh?: number;

  @ApiPropertyOptional({ example: 425.8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  billedAmount?: number;

  @ApiPropertyOptional({ default: 'MANUAL', enum: ['MANUAL', 'BILL', 'IMPORT'] })
  @IsOptional()
  @IsIn(['MANUAL', 'BILL', 'IMPORT'])
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class EnergyReadingViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() utilityUnitId!: string;
  @ApiProperty() referenceMonth!: string;
  @ApiProperty() consumptionKwh!: number;
  @ApiPropertyOptional() injectedKwh!: number | null;
  @ApiPropertyOptional() billedAmount!: number | null;
  @ApiProperty() source!: string;
  @ApiProperty() status!: string;
  @ApiPropertyOptional() notes!: string | null;
  @ApiProperty() createdAt!: string;
}

export class ConsumptionSummaryViewDto {
  @ApiProperty({ type: [EnergyReadingViewDto] }) readings!: EnergyReadingViewDto[];
  @ApiProperty() validMonthsCount!: number;
  @ApiProperty() hasIncompleteHistory!: boolean;
  @ApiProperty() averageMonthlyConsumptionKwh!: number;
  @ApiProperty() annualizedConsumptionKwh!: number;
  @ApiProperty() targetConsumptionKwh!: number;
}

export class CreateSurveyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  utilityUnitId?: string;

  @ApiProperty({ default: 'REMOTE', enum: ['REMOTE', 'ONSITE', 'HYBRID'] })
  @IsOptional()
  @IsIn(['REMOTE', 'ONSITE', 'HYBRID'])
  type?: string;

  @ApiProperty({ default: 0.95 })
  @IsNumber()
  @Min(0.01)
  tariffPerKwh!: number;

  @ApiProperty({ default: 'BIPHASIC', enum: ['MONOPHASIC', 'BIPHASIC', 'TRIPHASIC'] })
  @IsOptional()
  @IsIn(['MONOPHASIC', 'BIPHASIC', 'TRIPHASIC'])
  connectionType?: string;

  @ApiProperty({ default: '220V' })
  @IsOptional()
  @IsString()
  voltage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roofType?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  shadingKnown?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  plannedAdditionalLoadKwh?: number;
}

export class SurveyViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() opportunityId!: string;
  @ApiPropertyOptional() utilityUnitId!: string | null;
  @ApiProperty() type!: string;
  @ApiProperty() status!: string;
  @ApiProperty() tariffPerKwh!: number;
  @ApiProperty() connectionType!: string;
  @ApiProperty() voltage!: string;
  @ApiPropertyOptional() roofType!: string | null;
  @ApiProperty() shadingKnown!: boolean;
  @ApiPropertyOptional() notes!: string | null;
  @ApiPropertyOptional() assumptions!: Record<string, unknown> | null;
  @ApiPropertyOptional() completedById!: string | null;
  @ApiPropertyOptional() completedAt!: string | null;
  @ApiProperty() version!: number;
  @ApiProperty() createdAt!: string;
}

export class CreateCatalogItemDto {
  @ApiProperty({ example: 'MOD-LONGI-630W' })
  @IsString()
  sku!: string;

  @ApiProperty({ enum: ['MATERIAL', 'SERVICE'] })
  @IsIn(['MATERIAL', 'SERVICE'])
  kind!: string;

  @ApiProperty({
    enum: [
      'MODULE',
      'INVERTER',
      'STRUCTURE',
      'CABLE_ELECTRICAL',
      'BATTERY',
      'SERVICE_INSTALLATION',
      'SERVICE_ENGINEERING',
      'OTHER',
    ],
  })
  @IsIn([
    'MODULE',
    'INVERTER',
    'STRUCTURE',
    'CABLE_ELECTRICAL',
    'BATTERY',
    'SERVICE_INSTALLATION',
    'SERVICE_ENGINEERING',
    'OTHER',
  ])
  category!: string;

  @ApiProperty({ example: 'Módulo Fotovoltaico Longi 630W N-Type' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Longi Solar' })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ example: 'Hi-MO X6' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ default: 'UN' })
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @ApiPropertyOptional({ example: 630 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  powerRatingWp?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  powerRatingKw?: number;

  @ApiProperty({ example: 650.0 })
  @IsNumber()
  @Min(0)
  referenceCost!: number;

  @ApiPropertyOptional({ example: 850.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  referencePrice?: number;
}

export class UpdateCatalogItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  powerRatingWp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  powerRatingKw?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  referenceCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  referencePrice?: number;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  expectedVersion!: number;
}

export class CatalogItemViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() sku!: string;
  @ApiProperty() kind!: string;
  @ApiProperty() category!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() manufacturer!: string | null;
  @ApiPropertyOptional() model!: string | null;
  @ApiProperty() unitOfMeasure!: string;
  @ApiPropertyOptional() powerRatingWp!: number | null;
  @ApiPropertyOptional() powerRatingKw!: number | null;
  @ApiProperty() referenceCost!: number;
  @ApiPropertyOptional() referencePrice!: number | null;
  @ApiProperty() status!: string;
  @ApiProperty() version!: number;
}

export class DesignItemInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  catalogItemId?: string;

  @ApiProperty({ enum: ['MATERIAL', 'SERVICE'] })
  @IsIn(['MATERIAL', 'SERVICE'])
  kind!: string;

  @ApiProperty()
  @IsString()
  category!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty({ default: 'UN' })
  @IsString()
  unitOfMeasure!: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @ApiProperty({ example: 650.0 })
  @IsNumber()
  @Min(0)
  unitCost!: number;

  @ApiPropertyOptional({ default: 'CATALOG', enum: ['CATALOG', 'MANUAL', 'QUOTE'] })
  @IsOptional()
  @IsIn(['CATALOG', 'MANUAL', 'QUOTE'])
  costSource?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  justification?: string;
}

export class AdditionalCostInputDto {
  @ApiProperty({
    enum: [
      'LABOR',
      'FREIGHT',
      'ENGINEERING_ART',
      'EQUIPMENT_RENTAL',
      'ELECTRICAL_ADEQUACY',
      'TAXES',
      'COMMISSION',
      'CONTINGENCY',
      'OTHER',
    ],
  })
  @IsIn([
    'LABOR',
    'FREIGHT',
    'ENGINEERING_ART',
    'EQUIPMENT_RENTAL',
    'ELECTRICAL_ADEQUACY',
    'TAXES',
    'COMMISSION',
    'CONTINGENCY',
    'OTHER',
  ])
  category!: string;

  @ApiProperty({ example: 'Homologação e ART do projeto elétrico' })
  @IsString()
  description!: string;

  @ApiProperty({ example: 1200.0 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({
    default: 'INCLUDED_IN_PRICE',
    enum: ['INCLUDED_IN_PRICE', 'BILLED_SEPARATELY', 'INTERNAL_MONITORING'],
  })
  @IsOptional()
  @IsIn(['INCLUDED_IN_PRICE', 'BILLED_SEPARATELY', 'INTERNAL_MONITORING'])
  commercialTreatment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  justification?: string;
}

export class CreateDesignDto {
  @ApiPropertyOptional({ default: 'Dimensionamento Padrão' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ default: 'ON_GRID', enum: ['ON_GRID', 'OFF_GRID', 'HYBRID'] })
  @IsOptional()
  @IsIn(['ON_GRID', 'OFF_GRID', 'HYBRID'])
  systemType?: string;

  @ApiProperty({ example: 600.0 })
  @IsNumber()
  @Min(1)
  targetMonthlyGenerationKwh!: number;

  @ApiPropertyOptional({ default: 135.0 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  specificYield?: number;
}

export class SuggestDesignDto {
  @ApiProperty({ example: 600.0 })
  @IsNumber()
  @Min(1)
  targetMonthlyGenerationKwh!: number;

  @ApiPropertyOptional({ default: 135.0 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  specificYield?: number;

  @ApiPropertyOptional({ default: 630 })
  @IsOptional()
  @IsNumber()
  @Min(100)
  preferredModulePowerWp?: number;
}

export class DesignSuggestionViewDto {
  @ApiProperty() targetMonthlyGenerationKwh!: number;
  @ApiProperty() specificYield!: number;
  @ApiProperty() suggestedDcPowerKwp!: number;
  @ApiProperty() suggestedModuleQuantity!: number;
  @ApiProperty() suggestedModulePowerWp!: number;
  @ApiPropertyOptional() suggestedModuleSku!: string | null;
  @ApiProperty() suggestedInverterPowerKw!: number;
  @ApiProperty() suggestedInverterQuantity!: number;
  @ApiPropertyOptional() suggestedInverterSku!: string | null;
  @ApiProperty() dcAcRatio!: number;
  @ApiProperty() estimatedMonthlyGenerationKwh!: number;
  @ApiProperty() estimatedAnnualGenerationKwh!: number;
  @ApiProperty() classification!: string;
}

export class UpdateDesignVersionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  targetMonthlyGenerationKwh?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetConsumptionKwh?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  specificYield?: number;

  @ApiProperty({ type: [DesignItemInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignItemInputDto)
  items!: DesignItemInputDto[];

  @ApiPropertyOptional({ type: [AdditionalCostInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdditionalCostInputDto)
  additionalCosts?: AdditionalCostInputDto[];

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  contingencyAmount?: number;

  @ApiProperty({ example: 35.0, description: 'Markup percentual sobre o custo total estimado' })
  @IsNumber()
  @Min(0)
  markupPercent!: number;

  @ApiPropertyOptional({ default: 0, description: 'Desconto absoluto em moeda' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;
}

export class ApproveDesignVersionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  justification?: string;

  @ApiPropertyOptional({
    description: 'Obrigatório se a margem for inferior à alçada mínima (20%)',
  })
  @IsOptional()
  @IsString()
  overrideLowMarginReason?: string;
}

export class PricingViewDto {
  @ApiProperty() directMaterialCost!: number;
  @ApiProperty() directServiceCost!: number;
  @ApiProperty() additionalCost!: number;
  @ApiProperty() contingencyAmount!: number;
  @ApiProperty() totalEstimatedCost!: number;
  @ApiProperty() markupPercent!: number;
  @ApiProperty() priceBeforeDiscount!: number;
  @ApiProperty() discountAmount!: number;
  @ApiProperty() finalPrice!: number;
  @ApiProperty() grossMarginAmount!: number;
  @ApiProperty() grossMarginPercent!: number;
  @ApiProperty() status!: string;
}

export class DesignItemViewDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() catalogItemId!: string | null;
  @ApiProperty() kind!: string;
  @ApiProperty() category!: string;
  @ApiProperty() description!: string;
  @ApiProperty() unitOfMeasure!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() unitCost!: number;
  @ApiProperty() totalCost!: number;
  @ApiProperty() costSource!: string;
  @ApiProperty() isOptional!: boolean;
  @ApiPropertyOptional() justification!: string | null;
}

export class AdditionalCostViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() category!: string;
  @ApiProperty() description!: string;
  @ApiProperty() amount!: number;
  @ApiProperty() commercialTreatment!: string;
  @ApiPropertyOptional() justification!: string | null;
}

export class DesignVersionViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() designId!: string;
  @ApiProperty() versionNumber!: number;
  @ApiPropertyOptional() basedOnVersionId!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() systemType!: string;
  @ApiProperty() targetMonthlyGenerationKwh!: number;
  @ApiProperty() targetConsumptionKwh!: number;
  @ApiProperty() dcPowerKwp!: number;
  @ApiProperty() acPowerKw!: number;
  @ApiProperty() estimatedMonthlyGenerationKwh!: number;
  @ApiProperty() estimatedAnnualGenerationKwh!: number;
  @ApiProperty() coveragePercent!: number;
  @ApiProperty() specificYield!: number;
  @ApiProperty() calculationVersion!: string;
  @ApiProperty() assumptionsSnapshot!: Record<string, unknown>;
  @ApiPropertyOptional() approvedById!: string | null;
  @ApiPropertyOptional() approvedAt!: string | null;
  @ApiPropertyOptional() justification!: string | null;
  @ApiProperty({ type: [DesignItemViewDto] }) items!: DesignItemViewDto[];
  @ApiProperty({ type: [AdditionalCostViewDto] }) additionalCosts!: AdditionalCostViewDto[];
  @ApiPropertyOptional({ type: PricingViewDto }) pricing!: PricingViewDto | null;
  @ApiProperty() createdAt!: string;
}

export class DesignViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() opportunityId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() currentVersionNumber!: number;
  @ApiProperty({ type: [DesignVersionViewDto] }) versions!: DesignVersionViewDto[];
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

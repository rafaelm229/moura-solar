import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class DuplicateCheckQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() taxId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() externalCode?: string;
}

export class DuplicateMatchDto {
  @ApiProperty({ enum: ['STRONG', 'MODERATE'] }) strength!: 'STRONG' | 'MODERATE';
  @ApiProperty() reason!: string;
  @ApiProperty() customerId!: string;
  @ApiProperty() customerName!: string;
  @ApiPropertyOptional() taxId?: string;
}

export class CreateCustomerDto {
  @ApiProperty({ enum: ['PERSON', 'COMPANY'], default: 'PERSON' })
  @IsIn(['PERSON', 'COMPANY'])
  kind: string = 'PERSON';

  @ApiProperty({ minLength: 2, maxLength: 200 })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  legalName!: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stateRegistration?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  overrideDuplicate?: boolean;
}

export class UpdateCustomerDto {
  @ApiProperty() @IsInt() @Min(1) expectedVersion!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(200) legalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tradeName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class AddContactDto {
  @ApiProperty({ enum: ['PHONE', 'EMAIL', 'WHATSAPP', 'OTHER'] })
  @IsIn(['PHONE', 'EMAIL', 'WHATSAPP', 'OTHER'])
  type!: string;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) value!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() label?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class AddAddressDto {
  @ApiProperty() @IsString() postalCode!: string;
  @ApiProperty() @IsString() street!: string;
  @ApiProperty() @IsString() number!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() complement?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() district?: string;
  @ApiProperty() @IsString() city!: string;
  @ApiProperty() @IsString() state!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class CreateUtilityUnitDto {
  @ApiProperty() @IsString() @MinLength(2) distributorName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() externalCode?: string;
  @ApiPropertyOptional({ default: 'RESIDENTIAL' }) @IsOptional() @IsString() consumerClass?: string;
  @ApiPropertyOptional({ default: 'CONVENTIONAL' }) @IsOptional() @IsString() tariffMode?: string;
  @ApiPropertyOptional({ default: 'BIPHASIC' }) @IsOptional() @IsString() connectionType?: string;
  @ApiPropertyOptional({ default: '220V' }) @IsOptional() @IsString() voltage?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() addressId?: string;
}

export class CreateAndLinkUtilityUnitDto extends CreateUtilityUnitDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedVersion!: number;
}

export class UpdateUtilityUnitDto {
  @ApiProperty() @IsInt() @Min(1) expectedVersion!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() distributorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() externalCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() consumerClass?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tariffMode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() connectionType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() voltage?: string;
}

export class FirstActivityDto {
  @ApiProperty({ enum: ['CALL', 'MESSAGE', 'MEETING', 'VISIT', 'EMAIL', 'TASK'] })
  @IsIn(['CALL', 'MESSAGE', 'MEETING', 'VISIT', 'EMAIL', 'TASK'])
  type!: string;

  @ApiProperty() @IsString() @MinLength(2) subject!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsDateString() dueAt!: string;
}

export class CreateOpportunityDto {
  @ApiProperty() @IsUUID() customerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() utilityUnitId?: string;
  @ApiProperty() @IsString() @MinLength(2) title!: string;
  @ApiPropertyOptional({ default: 'INBOUND' }) @IsOptional() @IsString() source?: string;
  @ApiPropertyOptional({ default: 'ON_GRID' }) @IsOptional() @IsString() projectType?: string;
  @ApiProperty() @IsString() @MinLength(2) needSummary!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() estimatedConsumption?: number;
  @ApiPropertyOptional({ enum: ['COLD', 'WARM', 'HOT'], default: 'WARM' })
  @IsOptional()
  @IsIn(['COLD', 'WARM', 'HOT'])
  priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedCloseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() ownerUserId?: string;

  @ApiProperty({ type: FirstActivityDto })
  @ValidateNested()
  @Type(() => FirstActivityDto)
  firstActivity!: FirstActivityDto;
}

export class UpdateOpportunityDto {
  @ApiProperty() @IsInt() @Min(1) expectedVersion!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() needSummary?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() estimatedConsumption?: number;
  @ApiPropertyOptional({ enum: ['COLD', 'WARM', 'HOT'] })
  @IsOptional()
  @IsIn(['COLD', 'WARM', 'HOT'])
  priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedCloseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() ownerUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() utilityUnitId?: string;
}

export class QualifyOpportunityDto {
  @ApiProperty() @IsInt() @Min(1) expectedVersion!: number;
  @ApiProperty() @IsString() @MinLength(2) confirmedNeedSummary!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() estimatedConsumption?: number;
  @ApiPropertyOptional({ type: FirstActivityDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FirstActivityDto)
  nextActivity?: FirstActivityDto;
}

export class LoseOpportunityDto {
  @ApiProperty() @IsInt() @Min(1) expectedVersion!: number;
  @ApiProperty() @IsString() @MinLength(2) lossReason!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lossNotes?: string;
}

export class ReopenOpportunityDto {
  @ApiProperty() @IsInt() @Min(1) expectedVersion!: number;
  @ApiProperty() @IsString() @MinLength(2) justification!: string;
}

export class CreateActivityDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() opportunityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiProperty({ enum: ['CALL', 'MESSAGE', 'MEETING', 'VISIT', 'EMAIL', 'TASK'] })
  @IsIn(['CALL', 'MESSAGE', 'MEETING', 'VISIT', 'EMAIL', 'TASK'])
  type!: string;
  @ApiProperty() @IsString() @MinLength(2) subject!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assigneeUserId?: string;
  @ApiProperty() @IsDateString() dueAt!: string;
}

export class CompleteActivityDto {
  @ApiProperty() @IsInt() @Min(1) expectedVersion!: number;
  @ApiProperty() @IsString() @MinLength(2) resultCode!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resultNotes?: string;
  @ApiPropertyOptional({ type: FirstActivityDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FirstActivityDto)
  nextActivity?: FirstActivityDto;
}

export class RescheduleActivityDto {
  @ApiProperty() @IsInt() @Min(1) expectedVersion!: number;
  @ApiProperty() @IsDateString() dueAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ExpectedVersionDto {
  @ApiProperty() @IsInt() @Min(1) expectedVersion!: number;
}

// ---------------------------------------------------------------------------
// VIEW / RESPONSE DTOS (Used for OpenAPI contracts and client typing)
// ---------------------------------------------------------------------------

export class CustomerContactViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() type!: string;
  @ApiProperty() value!: string;
  @ApiPropertyOptional() label?: string;
  @ApiProperty() isPrimary!: boolean;
}

export class AddressViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() postalCode!: string;
  @ApiProperty() street!: string;
  @ApiProperty() number!: string;
  @ApiPropertyOptional() complement?: string;
  @ApiPropertyOptional() district?: string;
  @ApiProperty() city!: string;
  @ApiProperty() state!: string;
  @ApiProperty() isPrimary!: boolean;
}

export class UtilityUnitViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() organizationId!: string;
  @ApiProperty() customerId!: string;
  @ApiProperty() distributorName!: string;
  @ApiPropertyOptional() externalCode?: string;
  @ApiProperty() consumerClass!: string;
  @ApiProperty() tariffMode!: string;
  @ApiProperty() connectionType!: string;
  @ApiProperty() voltage!: string;
  @ApiPropertyOptional() addressId?: string;
  @ApiProperty() version!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class CustomerOpportunitySummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() title!: string;
  @ApiProperty() state!: string;
}

export class CustomerViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() organizationId!: string;
  @ApiProperty() kind!: string;
  @ApiProperty() legalName!: string;
  @ApiPropertyOptional() tradeName?: string;
  @ApiPropertyOptional() taxId?: string;
  @ApiPropertyOptional() stateRegistration?: string;
  @ApiProperty() status!: string;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() version!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiPropertyOptional({ type: [CustomerContactViewDto] }) contacts?: CustomerContactViewDto[];
  @ApiPropertyOptional({ type: [AddressViewDto] }) addresses?: AddressViewDto[];
  @ApiPropertyOptional({ type: [UtilityUnitViewDto] }) utilityUnits?: UtilityUnitViewDto[];
  @ApiPropertyOptional({ type: [CustomerOpportunitySummaryDto] })
  opportunities?: CustomerOpportunitySummaryDto[];
}

export class CustomerListResponseDto {
  @ApiProperty({ type: [CustomerViewDto] }) items!: CustomerViewDto[];
  @ApiProperty() total!: number;
}

export class OpportunityTransitionViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() fromState!: string;
  @ApiProperty() toState!: string;
  @ApiProperty() reason!: string;
  @ApiPropertyOptional() notes?: string;
  @ApiPropertyOptional() actorUserId?: string;
  @ApiProperty() createdAt!: string;
}

export class OpportunityCustomerViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() legalName!: string;
  @ApiPropertyOptional() tradeName?: string;
  @ApiPropertyOptional() taxId?: string;
  @ApiPropertyOptional({ type: [CustomerContactViewDto] }) contacts?: CustomerContactViewDto[];
}

export class OpportunityViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() organizationId!: string;
  @ApiProperty() code!: string;
  @ApiProperty() customerId!: string;
  @ApiPropertyOptional() utilityUnitId?: string;
  @ApiProperty() state!: string;
  @ApiPropertyOptional() lossReason?: string;
  @ApiPropertyOptional() lossNotes?: string;
  @ApiProperty() title!: string;
  @ApiProperty() source!: string;
  @ApiProperty() projectType!: string;
  @ApiProperty() needSummary!: string;
  @ApiPropertyOptional() estimatedConsumption?: number;
  @ApiProperty() priority!: string;
  @ApiPropertyOptional() expectedCloseDate?: string;
  @ApiProperty() ownerUserId!: string;
  @ApiProperty() version!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiPropertyOptional({ type: OpportunityCustomerViewDto }) customer?: OpportunityCustomerViewDto;
  @ApiPropertyOptional({ type: [OpportunityTransitionViewDto] })
  transitions?: OpportunityTransitionViewDto[];
  @ApiPropertyOptional({ type: UtilityUnitViewDto }) utilityUnit?: UtilityUnitViewDto;
}

export class OpportunityListResponseDto {
  @ApiProperty({ type: [OpportunityViewDto] }) items!: OpportunityViewDto[];
  @ApiProperty() total!: number;
}

export class ActivityAssigneeViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
}

export class ActivityCustomerViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() legalName!: string;
}

export class ActivityOpportunityViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() title!: string;
  @ApiProperty() state!: string;
}

export class ActivityViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() organizationId!: string;
  @ApiPropertyOptional() opportunityId?: string;
  @ApiPropertyOptional() customerId?: string;
  @ApiProperty() type!: string;
  @ApiProperty() subject!: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() assigneeUserId!: string;
  @ApiProperty() dueAt!: string;
  @ApiProperty() status!: string;
  @ApiPropertyOptional() resultCode?: string;
  @ApiPropertyOptional() resultNotes?: string;
  @ApiPropertyOptional() completedAt?: string;
  @ApiPropertyOptional() previousActivityId?: string;
  @ApiProperty() version!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiPropertyOptional({ type: ActivityOpportunityViewDto })
  opportunity?: ActivityOpportunityViewDto;
  @ApiPropertyOptional({ type: ActivityCustomerViewDto }) customer?: ActivityCustomerViewDto;
  @ApiPropertyOptional({ type: ActivityAssigneeViewDto }) assignee?: ActivityAssigneeViewDto;
}

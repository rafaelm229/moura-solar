import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class LoginDto {
  @ApiProperty() @IsEmail() @MaxLength(254) email!: string;
  @ApiProperty({ minLength: 12, maxLength: 128 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}
export class BootstrapDto extends LoginDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) organization!: string;
}
export class AcceptLinkDto {
  @ApiProperty() @IsString() @MinLength(43) @MaxLength(43) token!: string;
  @ApiProperty({ minLength: 12, maxLength: 128 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}
export class InviteDto {
  @ApiProperty() @IsEmail() @MaxLength(254) email!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @ApiProperty() @IsUUID() roleId!: string;
}
export class UpdateMemberDto {
  @ApiProperty() @IsInt() @Min(1) version!: number;
  @ApiProperty() @IsUUID() roleId!: string;
  @ApiProperty({ enum: ['active', 'blocked'] }) @IsIn(['active', 'blocked']) status!: string;
}
export class GrantDto {
  @ApiProperty() @IsString() permission!: string;
  @ApiProperty({ enum: ['own', 'team', 'organization', 'assigned', 'linked', 'domain'] })
  @IsIn(['own', 'team', 'organization', 'assigned', 'linked', 'domain'])
  scope!: string;
}
export class RoleDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @ApiProperty({ type: [GrantDto] })
  @IsArray()
  @ArrayMaxSize(250)
  @ValidateNested({ each: true })
  @Type(() => GrantDto)
  grants!: GrantDto[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) version?: number;
}
export class TeamDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  memberIds!: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) version?: number;
}
export class CommandResultDto {
  @ApiProperty() id!: string;
}
export class LinkResultDto extends CommandResultDto {
  @ApiProperty() token!: string;
  @ApiProperty() expiresAt!: string;
}
export class MemberViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty() roleId!: string;
  @ApiProperty() roleName!: string;
  @ApiProperty() status!: string;
  @ApiProperty() version!: number;
}
export class ContextDto extends MemberViewDto {
  @ApiProperty() userId!: string;
  @ApiProperty() organizationId!: string;
  @ApiProperty() organizationName!: string;
  @ApiProperty() sessionId!: string;
  @ApiProperty({ type: [GrantDto] }) grants!: GrantDto[];
  @ApiProperty({ type: [String] }) teamIds!: string[];
}
export class SessionViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() device!: string;
  @ApiProperty() current!: boolean;
  @ApiProperty() createdAt!: string;
  @ApiProperty() lastSeenAt!: string;
}
export class RoleViewDto extends RoleDto {
  @ApiProperty() id!: string;
}
export class TeamViewDto extends TeamDto {
  @ApiProperty() id!: string;
}
export class AuditViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() action!: string;
  @ApiProperty({ type: String, nullable: true }) actorId!: string | null;
  @ApiProperty({ type: String, nullable: true }) entityId!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() traceId!: string;
}

export class CandidateDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

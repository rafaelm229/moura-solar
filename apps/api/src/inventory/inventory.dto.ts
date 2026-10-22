import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ModuleAvailabilityViewDto {
  @ApiProperty({ format: 'uuid' }) catalogItemId!: string;
  @ApiProperty({ type: Number, minimum: 0 }) available!: number;
}

export class CreateStockLocationDto {
  @ApiProperty({ example: 'DEP-MATRIZ' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'Depósito Matriz' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    example: 'WAREHOUSE',
    enum: ['WAREHOUSE', 'VEHICLE', 'TRANSIT', 'QUARANTINE'],
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'Rua das Flores, 123 - Belo Horizonte/MG' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managerUserId?: string;
}

export class RecordMovementDto {
  @ApiProperty()
  @IsUUID()
  catalogItemId!: string;

  @ApiProperty({
    example: 'RECEIVE',
    enum: [
      'RECEIVE',
      'TRANSFER_OUT',
      'TRANSFER_IN',
      'CONSUME',
      'RETURN',
      'ADJUST',
      'LOSS',
      'QUARANTINE',
      'RELEASE',
    ],
  })
  @IsString()
  type!: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @ApiPropertyOptional({ example: 450.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fromLocationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  toLocationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  opportunityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  goodsReceiptId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serialNumbers?: string[];
}

export class ReservationItemInputDto {
  @ApiProperty()
  @IsUUID()
  catalogItemId!: string;

  @ApiProperty()
  @IsUUID()
  locationId!: string;

  @ApiProperty({ example: 14 })
  @IsNumber()
  @Min(0.0001)
  quantityNeeded!: number;
}

export class ReserveKitDto {
  @ApiProperty()
  @IsUUID()
  opportunityId!: string;

  @ApiProperty({ type: [ReservationItemInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReservationItemInputDto)
  items!: ReservationItemInputDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReleaseReservationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateSupplierDto {
  @ApiProperty({ example: 'FORN-WEG' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'WEG Equipamentos Elétricos S.A.' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'WEG Solar' })
  @IsOptional()
  @IsString()
  tradeName?: string;

  @ApiProperty({ example: '07.175.725/0001-63' })
  @IsString()
  documentNumber!: string;

  @ApiPropertyOptional({ example: 'Carlos Mendes' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ example: 'solar@weg.net' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '(47) 3276-4000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Av. Prefeito Waldemar Grubba, 3300' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Jaraguá do Sul' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'SC' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    example: 'SOLAR_EQUIPMENT',
    enum: ['SOLAR_EQUIPMENT', 'ELECTRICAL', 'STRUCTURAL', 'SERVICE'],
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  leadTimeDays?: number;

  @ApiPropertyOptional({ example: '28/56 dias' })
  @IsOptional()
  @IsString()
  paymentTerms?: string;
}

export class PurchaseOrderItemInputDto {
  @ApiProperty()
  @IsUUID()
  catalogItemId!: string;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0.0001)
  quantityOrdered!: number;

  @ApiProperty({ example: 380.0 })
  @IsNumber()
  @Min(0)
  unitCost!: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsUUID()
  supplierId!: string;

  @ApiProperty({ example: 'PO-2026-001' })
  @IsString()
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  opportunityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PurchaseOrderItemInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemInputDto)
  items!: PurchaseOrderItemInputDto[];
}

export class GoodsReceiptItemInputDto {
  @ApiProperty()
  @IsUUID()
  catalogItemId!: string;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0.0001)
  quantityReceived!: number;

  @ApiProperty({ example: 380.0 })
  @IsNumber()
  @Min(0)
  unitCost!: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serialNumbers?: string[];
}

export class ReceiveGoodsDto {
  @ApiProperty()
  @IsUUID()
  purchaseOrderId!: string;

  @ApiProperty()
  @IsUUID()
  locationId!: string;

  @ApiProperty({ example: 'REC-2026-001' })
  @IsString()
  code!: string;

  @ApiPropertyOptional({ example: 'NF-e 001928' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [GoodsReceiptItemInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptItemInputDto)
  items!: GoodsReceiptItemInputDto[];
}

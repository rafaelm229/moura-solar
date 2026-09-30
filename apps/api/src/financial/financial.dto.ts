import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum FinancialAccountType {
  CHECKING = 'CHECKING',
  CASH = 'CASH',
  ESCROW = 'ESCROW',
  SAVINGS = 'SAVINGS',
}

export enum PaymentMethod {
  PIX = 'PIX',
  TED = 'TED',
  BOLETO = 'BOLETO',
  CREDIT_CARD = 'CREDIT_CARD',
  CASH = 'CASH',
  FINANCING_RELEASE = 'FINANCING_RELEASE',
  MIXED = 'MIXED',
}

export enum PayableCategory {
  EQUIPMENT = 'EQUIPMENT',
  INSTALLATION_LABOR = 'INSTALLATION_LABOR',
  COMMISSION = 'COMMISSION',
  ENGINEERING_HOMOLOGATION = 'ENGINEERING_HOMOLOGATION',
  FREIGHT = 'FREIGHT',
  OTHER = 'OTHER',
}

export class CreateFinancialAccountDto {
  @ApiProperty({ description: 'Nome da conta financeira (ex: Banco Cora - Moura Solar)' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ enum: FinancialAccountType, default: FinancialAccountType.CHECKING })
  @IsEnum(FinancialAccountType)
  @IsOptional()
  accountType?: FinancialAccountType;

  @ApiPropertyOptional({ description: 'Código do banco (ex: 403 para Cora)' })
  @IsString()
  @IsOptional()
  bankCode?: string;

  @ApiPropertyOptional({ description: 'Agência bancária' })
  @IsString()
  @IsOptional()
  agency?: string;

  @ApiPropertyOptional({ description: 'Número da conta corrente' })
  @IsString()
  @IsOptional()
  accountNumber?: string;
}

export class GeneratePaymentPlanDto {
  @ApiPropertyOptional({ description: 'ID do contrato vinculado' })
  @IsUUID()
  @IsOptional()
  contractId?: string;

  @ApiPropertyOptional({
    description: 'Valor total a faturar (se omitido, lê do contrato ou proposta aceita)',
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  totalAmount?: number;

  @ApiPropertyOptional({ description: 'Valor de entrada / sinal', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  downPaymentAmount?: number;

  @ApiPropertyOptional({ description: 'Quantidade de parcelas do saldo', default: 3 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  installmentCount?: number;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.PIX })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Data do primeiro vencimento do saldo (ISO YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  firstDueDate?: string;

  @ApiPropertyOptional({ description: 'Observações do plano de pagamento' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReceiptAllocationItemDto {
  @ApiProperty({ description: 'ID do título a receber' })
  @IsUUID()
  @IsNotEmpty()
  receivableId!: string;

  @ApiProperty({ description: 'Valor principal alocado' })
  @IsNumber()
  @IsPositive()
  allocatedPrincipal!: number;

  @ApiPropertyOptional({ description: 'Juros recebidos', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  interestAmount?: number;

  @ApiPropertyOptional({ description: 'Desconto concedido', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discountAmount?: number;
}

export class RecordReceiptDto {
  @ApiPropertyOptional({ description: 'ID da oportunidade vinculada' })
  @IsUUID()
  @IsOptional()
  opportunityId?: string;

  @ApiProperty({ description: 'ID da conta financeira que recebeu os fundos' })
  @IsUUID()
  @IsNotEmpty()
  accountId!: string;

  @ApiProperty({ description: 'Valor total recebido' })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ description: 'Data efetiva da compensação/recebimento (ISO date)' })
  @IsDateString()
  @IsOptional()
  effectiveDate?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.PIX })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Nome de quem efetuou o pagamento' })
  @IsString()
  @IsOptional()
  payerName?: string;

  @ApiPropertyOptional({ description: 'CPF ou CNPJ do pagador' })
  @IsString()
  @IsOptional()
  payerTaxId?: string;

  @ApiPropertyOptional({ description: 'URL ou chave do comprovante' })
  @IsString()
  @IsOptional()
  receiptDocumentUrl?: string;

  @ApiPropertyOptional({ description: 'Notas ou observações do recebimento' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description:
      'Alocações em títulos a receber (se omitido e tiver oportunidade, aloca automaticamente nos mais antigos)',
    type: [ReceiptAllocationItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiptAllocationItemDto)
  @IsOptional()
  allocations?: ReceiptAllocationItemDto[];
}

export class CreatePayableDto {
  @ApiPropertyOptional({ description: 'ID da oportunidade associada ao custo' })
  @IsUUID()
  @IsOptional()
  opportunityId?: string;

  @ApiProperty({ enum: PayableCategory, description: 'Categoria do custo/despesa' })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiProperty({ description: 'Descrição da despesa ou fornecimento' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ description: 'Nome do fornecedor ou beneficiário' })
  @IsString()
  @IsNotEmpty()
  recipient!: string;

  @ApiPropertyOptional({ description: 'CPF ou CNPJ do recebedor' })
  @IsString()
  @IsOptional()
  recipientTaxId?: string;

  @ApiProperty({ description: 'Valor original da obrigação' })
  @IsNumber()
  @IsPositive()
  originalAmount!: number;

  @ApiProperty({ description: 'Data de vencimento (ISO YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  dueDate!: string;

  @ApiPropertyOptional({ description: 'Observações' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class PaymentAllocationItemDto {
  @ApiProperty({ description: 'ID da conta a pagar' })
  @IsUUID()
  @IsNotEmpty()
  payableId!: string;

  @ApiProperty({ description: 'Valor alocado/liquidado' })
  @IsNumber()
  @IsPositive()
  allocatedAmount!: number;
}

export class RecordPaymentDto {
  @ApiProperty({ description: 'ID da conta financeira debitada' })
  @IsUUID()
  @IsNotEmpty()
  accountId!: string;

  @ApiProperty({ description: 'Valor total pago' })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ description: 'Data efetiva do pagamento (ISO date)' })
  @IsDateString()
  @IsOptional()
  effectiveDate?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.PIX })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Número do documento ou autenticação bancária' })
  @IsString()
  @IsOptional()
  documentNumber?: string;

  @ApiPropertyOptional({ description: 'Observações do pagamento' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Alocações nas contas a pagar',
    type: [PaymentAllocationItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationItemDto)
  @IsOptional()
  allocations?: PaymentAllocationItemDto[];
}

export class ConfigureCommissionDto {
  @ApiProperty({ description: 'ID da oportunidade' })
  @IsUUID()
  @IsNotEmpty()
  opportunityId!: string;

  @ApiProperty({ description: 'Nome do consultor ou parceiro beneficiário' })
  @IsString()
  @IsNotEmpty()
  beneficiaryName!: string;

  @ApiPropertyOptional({ description: 'Função do participante', default: 'SALES_REP' })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiProperty({ description: 'Percentual de comissão (ex: 3.50 para 3.5%)' })
  @IsNumber()
  @IsPositive()
  percentage!: number;

  @ApiPropertyOptional({ description: 'Gatilho de aquisição', default: 'FINANCIAL' })
  @IsString()
  @IsOptional()
  triggerGate?: string;

  @ApiPropertyOptional({ description: 'Notas da comissão' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReverseTransactionDto {
  @ApiProperty({ description: 'Motivo / justificativa do estorno' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

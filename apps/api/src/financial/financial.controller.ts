import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequirePermission, type IdentityRequest } from '../identity/identity.guard';
import { FinancialService } from './financial.service';
import {
  CreateFinancialAccountDto,
  GeneratePaymentPlanDto,
  RecordReceiptDto,
  CreatePayableDto,
  RecordPaymentDto,
  ConfigureCommissionDto,
  ReverseTransactionDto,
} from './financial.dto';

@ApiTags('financial')
@ApiCookieAuth()
@Controller()
export class FinancialController {
  constructor(private readonly service: FinancialService) {}

  // ==========================================
  // ACCOUNTS
  // ==========================================

  @Get('financial/accounts')
  @RequirePermission('cashflow:read')
  async listAccounts(@Req() req: IdentityRequest) {
    return this.service.listAccounts(req.actor.organizationId);
  }

  @Post('financial/accounts')
  @RequirePermission('cashflow:manage_accounts')
  @HttpCode(201)
  @ApiBody({ type: CreateFinancialAccountDto })
  async createAccount(@Req() req: IdentityRequest, @Body() dto: CreateFinancialAccountDto) {
    return this.service.createAccount(req.actor.organizationId, req.actor.userId, dto);
  }

  // ==========================================
  // OPPORTUNITY FINANCIAL SUMMARY & PLAN
  // ==========================================

  @Get('opportunities/:opportunityId/financial')
  @RequirePermission('finance:read')
  async getOpportunityFinancial(
    @Req() req: IdentityRequest,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
  ) {
    return this.service.getFinancialSummary(req.actor.organizationId, opportunityId);
  }

  @Post('opportunities/:opportunityId/payment-plan/generate')
  @RequirePermission('receivables:create')
  @HttpCode(201)
  @ApiBody({ type: GeneratePaymentPlanDto })
  async generatePaymentPlan(
    @Req() req: IdentityRequest,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @Body() dto: GeneratePaymentPlanDto,
  ) {
    return this.service.generatePaymentPlanFromContract(
      req.actor.organizationId,
      opportunityId,
      req.actor.userId,
      dto,
    );
  }

  // ==========================================
  // RECEIPTS
  // ==========================================

  @Post('receipts')
  @RequirePermission('receipts:create')
  @HttpCode(201)
  @ApiBody({ type: RecordReceiptDto })
  async recordReceipt(@Req() req: IdentityRequest, @Body() dto: RecordReceiptDto) {
    return this.service.recordReceipt(req.actor.organizationId, req.actor.userId, dto);
  }

  @Post('receipts/:id/reverse')
  @RequirePermission('receipts:reverse')
  @HttpCode(200)
  @ApiBody({ type: ReverseTransactionDto })
  async reverseReceipt(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReverseTransactionDto,
  ) {
    return this.service.reverseReceipt(req.actor.organizationId, id, req.actor.userId, dto.reason);
  }

  // ==========================================
  // PAYABLES & PAYMENTS
  // ==========================================

  @Get('payables')
  @RequirePermission('payables:read')
  @ApiQuery({ name: 'opportunityId', required: false })
  async listPayables(@Req() req: IdentityRequest, @Query('opportunityId') opportunityId?: string) {
    return this.service.listPayables(req.actor.organizationId, opportunityId);
  }

  @Post('payables')
  @RequirePermission('payables:create')
  @HttpCode(201)
  @ApiBody({ type: CreatePayableDto })
  async createPayable(@Req() req: IdentityRequest, @Body() dto: CreatePayableDto) {
    return this.service.createPayable(req.actor.organizationId, req.actor.userId, dto);
  }

  @Post('payments')
  @RequirePermission('payments:create')
  @HttpCode(201)
  @ApiBody({ type: RecordPaymentDto })
  async recordPayment(@Req() req: IdentityRequest, @Body() dto: RecordPaymentDto) {
    return this.service.recordPayment(req.actor.organizationId, req.actor.userId, dto);
  }

  // ==========================================
  // COMMISSIONS
  // ==========================================

  @Get('commissions')
  @RequirePermission('commissions:read_all')
  @ApiQuery({ name: 'opportunityId', required: false })
  async listCommissions(
    @Req() req: IdentityRequest,
    @Query('opportunityId') opportunityId?: string,
  ) {
    return this.service.listCommissions(req.actor.organizationId, opportunityId);
  }

  @Post('commissions')
  @RequirePermission('commissions:configure')
  @HttpCode(201)
  @ApiBody({ type: ConfigureCommissionDto })
  async configureCommission(@Req() req: IdentityRequest, @Body() dto: ConfigureCommissionDto) {
    return this.service.configureCommission(req.actor.organizationId, req.actor.userId, dto);
  }

  // ==========================================
  // CASH FLOW
  // ==========================================

  @Get('financial/cash-flow')
  @RequirePermission('cashflow:read')
  async getCashFlow(@Req() req: IdentityRequest) {
    return this.service.getCashFlow(req.actor.organizationId);
  }
}

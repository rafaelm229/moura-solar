import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermission, type IdentityRequest } from '../identity/identity.guard';
import {
  ConfirmEnergyBillImportDto,
  CreateEnergyBillImportDto,
  EnergyBillImportReceiptDto,
  EnergyBillImportViewDto,
  ReviewEnergyBillImportDto,
} from './energy-import.dto';
import { EnergyImportService } from './energy-import.service';

@ApiTags('energy-imports')
@ApiCookieAuth()
@Controller()
export class EnergyImportController {
  constructor(private readonly service: EnergyImportService) {}

  @Post('customers/:customerId/energy-imports')
  @RequirePermission('energy_imports:create')
  @ApiHeader({ name: 'idempotency-key', required: true })
  @ApiBody({ type: CreateEnergyBillImportDto })
  @ApiCreatedResponse({ type: EnergyBillImportViewDto })
  async create(
    @Req() req: IdentityRequest,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: CreateEnergyBillImportDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ): Promise<EnergyBillImportViewDto> {
    return this.service.create(
      req.actor,
      customerId,
      dto,
      idempotencyKey,
      req.requestId ?? 'trace',
    );
  }

  @Get('energy-imports/:id')
  @RequirePermission('energy_imports:read')
  @HttpCode(200)
  @ApiOkResponse({ type: EnergyBillImportViewDto })
  async get(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EnergyBillImportViewDto> {
    return this.service.get(req.actor, id);
  }

  @Put('energy-imports/:id/review')
  @RequirePermission('energy_imports:review')
  @ApiHeader({ name: 'idempotency-key', required: true })
  @HttpCode(200)
  @ApiBody({ type: ReviewEnergyBillImportDto })
  @ApiOkResponse({ type: EnergyBillImportViewDto })
  async review(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewEnergyBillImportDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ): Promise<EnergyBillImportViewDto> {
    return this.service.review(req.actor, id, dto, idempotencyKey, req.requestId ?? 'trace');
  }

  @Post('energy-imports/:id/confirm')
  @RequirePermission('energy_imports:confirm')
  @ApiHeader({ name: 'idempotency-key', required: true })
  @HttpCode(200)
  @ApiBody({ type: ConfirmEnergyBillImportDto })
  @ApiOkResponse({ type: EnergyBillImportReceiptDto })
  async confirm(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmEnergyBillImportDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ): Promise<EnergyBillImportReceiptDto> {
    return this.service.confirm(req.actor, id, dto, idempotencyKey, req.requestId ?? 'trace');
  }
}

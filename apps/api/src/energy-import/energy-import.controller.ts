import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
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
import { CreateEnergyBillImportDto, EnergyBillImportViewDto } from './energy-import.dto';
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
}

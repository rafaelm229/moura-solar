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
import { InventoryService } from './inventory.service';
import {
  CreatePurchaseOrderDto,
  CreateStockLocationDto,
  CreateSupplierDto,
  ModuleAvailabilityViewDto,
  ReceiveGoodsDto,
  RecordMovementDto,
  ReserveKitDto,
} from './inventory.dto';

@ApiTags('inventory')
@ApiCookieAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get('module-availability')
  @RequirePermission('inventory:availability:read')
  @ApiOkResponse({ type: [ModuleAvailabilityViewDto] })
  async listModuleAvailability(@Req() req: IdentityRequest) {
    return this.service.listModuleAvailability(req.actor.organizationId);
  }

  // ==========================================
  // LOCAIS DE ESTOQUE
  // ==========================================

  @Get('locations')
  @RequirePermission('inventory:read')
  async listLocations(@Req() req: IdentityRequest) {
    return this.service.listLocations(req.actor.organizationId);
  }

  @Post('locations')
  @RequirePermission('inventory:adjust')
  @HttpCode(201)
  @ApiBody({ type: CreateStockLocationDto })
  async createLocation(@Req() req: IdentityRequest, @Body() dto: CreateStockLocationDto) {
    return this.service.createLocation(req.actor.organizationId, dto);
  }

  // ==========================================
  // SALDOS
  // ==========================================

  @Get('balances')
  @RequirePermission('inventory:read')
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'catalogItemId', required: false })
  @ApiQuery({ name: 'lowStockOnly', required: false, type: Boolean })
  async listBalances(
    @Req() req: IdentityRequest,
    @Query('locationId') locationId?: string,
    @Query('catalogItemId') catalogItemId?: string,
    @Query('lowStockOnly') lowStockOnly?: string,
  ) {
    return this.service.listBalances(req.actor.organizationId, {
      locationId,
      catalogItemId,
      lowStockOnly: lowStockOnly === 'true',
    });
  }

  // ==========================================
  // MOVIMENTAÇÕES
  // ==========================================

  @Get('movements')
  @RequirePermission('inventory:read')
  @ApiQuery({ name: 'catalogItemId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'opportunityId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listMovements(
    @Req() req: IdentityRequest,
    @Query('catalogItemId') catalogItemId?: string,
    @Query('locationId') locationId?: string,
    @Query('opportunityId') opportunityId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.listMovements(req.actor.organizationId, {
      catalogItemId,
      locationId,
      opportunityId,
      limit,
    });
  }

  @Post('movements')
  @RequirePermission('inventory:adjust')
  @HttpCode(201)
  @ApiBody({ type: RecordMovementDto })
  async recordMovement(@Req() req: IdentityRequest, @Body() dto: RecordMovementDto) {
    return this.service.recordMovement(req.actor.organizationId, req.actor.userId, dto);
  }

  // ==========================================
  // RESERVAS
  // ==========================================

  @Get('reservations')
  @RequirePermission('inventory:read')
  @ApiQuery({ name: 'opportunityId', required: false })
  async listReservations(
    @Req() req: IdentityRequest,
    @Query('opportunityId') opportunityId?: string,
  ) {
    return this.service.listReservations(req.actor.organizationId, opportunityId);
  }

  @Post('reservations')
  @RequirePermission('inventory:reserve')
  @HttpCode(201)
  @ApiBody({ type: ReserveKitDto })
  async reserveKit(@Req() req: IdentityRequest, @Body() dto: ReserveKitDto) {
    return this.service.reserveKit(req.actor.organizationId, req.actor.userId, dto);
  }

  @Post('reservations/:id/release')
  @RequirePermission('inventory:release_reservation')
  @HttpCode(200)
  async releaseReservation(@Req() req: IdentityRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.releaseReservation(req.actor.organizationId, id);
  }

  // ==========================================
  // FORNECEDORES
  // ==========================================

  @Get('suppliers')
  @RequirePermission('inventory:read')
  async listSuppliers(@Req() req: IdentityRequest) {
    return this.service.listSuppliers(req.actor.organizationId);
  }

  @Post('suppliers')
  @RequirePermission('suppliers:manage')
  @HttpCode(201)
  @ApiBody({ type: CreateSupplierDto })
  async createSupplier(@Req() req: IdentityRequest, @Body() dto: CreateSupplierDto) {
    return this.service.createSupplier(req.actor.organizationId, dto);
  }

  // ==========================================
  // ORDENS DE COMPRA
  // ==========================================

  @Get('purchases')
  @RequirePermission('inventory:read')
  @ApiQuery({ name: 'status', required: false })
  async listPurchaseOrders(@Req() req: IdentityRequest, @Query('status') status?: string) {
    return this.service.listPurchaseOrders(req.actor.organizationId, status);
  }

  @Post('purchases')
  @RequirePermission('purchases:order')
  @HttpCode(201)
  @ApiBody({ type: CreatePurchaseOrderDto })
  async createPurchaseOrder(@Req() req: IdentityRequest, @Body() dto: CreatePurchaseOrderDto) {
    return this.service.createPurchaseOrder(req.actor.organizationId, req.actor.userId, dto);
  }

  @Post('purchases/:id/approve')
  @RequirePermission('purchases:approve')
  @HttpCode(200)
  async approvePurchaseOrder(@Req() req: IdentityRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.approvePurchaseOrder(req.actor.organizationId, req.actor.userId, id);
  }

  @Post('purchases/:id/receive')
  @RequirePermission('purchases:receive')
  @HttpCode(201)
  @ApiBody({ type: ReceiveGoodsDto })
  async receiveGoods(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceiveGoodsDto,
  ) {
    dto.purchaseOrderId = id;
    return this.service.receiveGoods(req.actor.organizationId, req.actor.userId, dto);
  }

  // ==========================================
  // SERIAIS
  // ==========================================

  @Get('serials')
  @RequirePermission('inventory:read')
  @ApiQuery({ name: 'catalogItemId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  async listSerializedAssets(
    @Req() req: IdentityRequest,
    @Query('catalogItemId') catalogItemId?: string,
    @Query('locationId') locationId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listSerializedAssets(req.actor.organizationId, {
      catalogItemId,
      locationId,
      status,
      search,
    });
  }
}

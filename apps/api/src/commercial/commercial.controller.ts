import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  RequirePermission,
  RequirePermissions,
  type IdentityRequest,
} from '../identity/identity.guard';
import { CommercialService } from './commercial.service';
import {
  ActivityViewDto,
  AddAddressDto,
  AddContactDto,
  AddressViewDto,
  CompleteActivityDto,
  CreateActivityDto,
  CreateAndLinkUtilityUnitDto,
  CreateCustomerDto,
  CreateOpportunityDto,
  CreateUtilityUnitDto,
  CustomerContactViewDto,
  CustomerListResponseDto,
  CustomerViewDto,
  DuplicateCheckQueryDto,
  DuplicateMatchDto,
  ExpectedVersionDto,
  LoseOpportunityDto,
  OpportunityListResponseDto,
  OpportunityViewDto,
  QualifyOpportunityDto,
  ReopenOpportunityDto,
  RescheduleActivityDto,
  UpdateCustomerDto,
  UpdateOpportunityDto,
  UpdateUtilityUnitDto,
  UtilityUnitViewDto,
} from './commercial.dto';

@ApiTags('Comercial')
@ApiCookieAuth('ms_access')
@Controller()
export class CommercialController {
  constructor(private readonly service: CommercialService) {}

  // ---------------------------------------------------------------------------
  // CUSTOMERS
  // ---------------------------------------------------------------------------

  @Get('customers/duplicates')
  @RequirePermission('customers:read', false)
  @ApiOkResponse({ type: [DuplicateMatchDto] })
  async checkDuplicates(@Req() req: IdentityRequest, @Query() query: DuplicateCheckQueryDto) {
    return this.service.checkDuplicates(req.actor.organizationId, query);
  }

  @Get('customers')
  @RequirePermission('customers:read', false)
  @ApiOkResponse({ type: CustomerListResponseDto })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'skip', required: false, type: String })
  @ApiQuery({ name: 'take', required: false, type: String })
  async listCustomers(
    @Req() req: IdentityRequest,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.service.listCustomers(req.actor, {
      search,
      status,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('customers/:customerId')
  @RequirePermission('customers:read', false)
  @ApiOkResponse({ type: CustomerViewDto })
  async getCustomer(
    @Req() req: IdentityRequest,
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ) {
    return this.service.getCustomer(req.actor, customerId);
  }

  @Post('customers')
  @RequirePermission('customers:create', false)
  @ApiCreatedResponse({ type: CustomerViewDto })
  async createCustomer(@Req() req: IdentityRequest, @Body() dto: CreateCustomerDto) {
    return this.service.createCustomer(req.actor, dto, req.requestId ?? 'trace');
  }

  @Patch('customers/:customerId')
  @RequirePermission('customers:update', false)
  @ApiOkResponse({ type: CustomerViewDto })
  async updateCustomer(
    @Req() req: IdentityRequest,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.service.updateCustomer(req.actor, customerId, dto, req.requestId ?? 'trace');
  }

  @Post('customers/:customerId/archive')
  @HttpCode(200)
  @RequirePermission('customers:archive', false)
  @ApiBody({ type: ExpectedVersionDto })
  @ApiOkResponse({ type: CustomerViewDto })
  async archiveCustomer(
    @Req() req: IdentityRequest,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() body: ExpectedVersionDto,
  ) {
    return this.service.archiveCustomer(
      req.actor,
      customerId,
      body.expectedVersion,
      req.requestId ?? 'trace',
    );
  }

  @Post('customers/:customerId/restore')
  @HttpCode(200)
  @RequirePermission('customers:restore', false)
  @ApiBody({ type: ExpectedVersionDto })
  @ApiOkResponse({ type: CustomerViewDto })
  async restoreCustomer(
    @Req() req: IdentityRequest,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() body: ExpectedVersionDto,
  ) {
    return this.service.restoreCustomer(
      req.actor,
      customerId,
      body.expectedVersion,
      req.requestId ?? 'trace',
    );
  }

  @Post('customers/:customerId/contacts')
  @RequirePermission('customers:update', false)
  @ApiCreatedResponse({ type: CustomerContactViewDto })
  async addContact(
    @Req() req: IdentityRequest,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: AddContactDto,
  ) {
    return this.service.addContact(req.actor, customerId, dto, req.requestId ?? 'trace');
  }

  @Delete('customers/:customerId/contacts/:contactId')
  @RequirePermission('customers:update', false)
  async deleteContact(
    @Req() req: IdentityRequest,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.service.deleteContact(req.actor, customerId, contactId, req.requestId ?? 'trace');
  }

  @Post('customers/:customerId/addresses')
  @RequirePermission('customers:update', false)
  @ApiCreatedResponse({ type: AddressViewDto })
  async addAddress(
    @Req() req: IdentityRequest,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: AddAddressDto,
  ) {
    return this.service.addAddress(req.actor, customerId, dto, req.requestId ?? 'trace');
  }

  // ---------------------------------------------------------------------------
  // UTILITY UNITS
  // ---------------------------------------------------------------------------

  @Get('customers/:customerId/utility-units')
  @RequirePermission('consumer_units:read', false)
  @ApiOkResponse({ type: [UtilityUnitViewDto] })
  async listUtilityUnits(
    @Req() req: IdentityRequest,
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ) {
    return this.service.listUtilityUnits(req.actor, customerId);
  }

  @Post('customers/:customerId/utility-units')
  @RequirePermission('consumer_units:manage', false)
  @ApiCreatedResponse({ type: UtilityUnitViewDto })
  async createUtilityUnit(
    @Req() req: IdentityRequest,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: CreateUtilityUnitDto,
  ) {
    return this.service.createUtilityUnit(req.actor, customerId, dto, req.requestId ?? 'trace');
  }

  @Post('opportunities/:opportunityId/utility-unit')
  @RequirePermissions('consumer_units:manage', 'opportunities:update')
  @ApiHeader({ name: 'idempotency-key', required: true })
  @ApiCreatedResponse({ type: UtilityUnitViewDto })
  async createAndLinkUtilityUnit(
    @Req() req: IdentityRequest,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @Body() dto: CreateAndLinkUtilityUnitDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    return this.service.createAndLinkUtilityUnit(
      req.actor,
      opportunityId,
      dto,
      idempotencyKey,
      req.requestId ?? 'trace',
    );
  }

  @Patch('utility-units/:utilityUnitId')
  @RequirePermission('consumer_units:manage', false)
  @ApiOkResponse({ type: UtilityUnitViewDto })
  async updateUtilityUnit(
    @Req() req: IdentityRequest,
    @Param('utilityUnitId', ParseUUIDPipe) utilityUnitId: string,
    @Body() dto: UpdateUtilityUnitDto,
  ) {
    return this.service.updateUtilityUnit(req.actor, utilityUnitId, dto, req.requestId ?? 'trace');
  }

  // ---------------------------------------------------------------------------
  // OPPORTUNITIES
  // ---------------------------------------------------------------------------

  @Get('opportunities')
  @RequirePermission('opportunities:read', false)
  @ApiOkResponse({ type: OpportunityListResponseDto })
  @ApiQuery({ name: 'state', required: false, type: String })
  @ApiQuery({ name: 'ownerUserId', required: false, type: String })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'skip', required: false, type: String })
  @ApiQuery({ name: 'take', required: false, type: String })
  async listOpportunities(
    @Req() req: IdentityRequest,
    @Query('state') state?: string,
    @Query('ownerUserId') ownerUserId?: string,
    @Query('customerId') customerId?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.service.listOpportunities(req.actor, {
      state,
      ownerUserId,
      customerId,
      search,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('opportunities/:opportunityId')
  @RequirePermission('opportunities:read', false)
  @ApiOkResponse({ type: OpportunityViewDto })
  async getOpportunity(
    @Req() req: IdentityRequest,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
  ) {
    return this.service.getOpportunity(req.actor, opportunityId);
  }

  @Post('opportunities')
  @RequirePermission('opportunities:create', false)
  @ApiCreatedResponse({ type: OpportunityViewDto })
  async createOpportunity(@Req() req: IdentityRequest, @Body() dto: CreateOpportunityDto) {
    return this.service.createOpportunity(req.actor, dto, req.requestId ?? 'trace');
  }

  @Patch('opportunities/:opportunityId')
  @RequirePermission('opportunities:update', false)
  @ApiOkResponse({ type: OpportunityViewDto })
  async updateOpportunity(
    @Req() req: IdentityRequest,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @Body() dto: UpdateOpportunityDto,
  ) {
    return this.service.updateOpportunity(req.actor, opportunityId, dto, req.requestId ?? 'trace');
  }

  @Post('opportunities/:opportunityId/qualify')
  @HttpCode(200)
  @RequirePermission('opportunities:qualify', false)
  @ApiOkResponse({ type: OpportunityViewDto })
  async qualifyOpportunity(
    @Req() req: IdentityRequest,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @Body() dto: QualifyOpportunityDto,
  ) {
    return this.service.qualifyOpportunity(req.actor, opportunityId, dto, req.requestId ?? 'trace');
  }

  @Post('opportunities/:opportunityId/lose')
  @HttpCode(200)
  @RequirePermission('opportunities:lose', false)
  @ApiOkResponse({ type: OpportunityViewDto })
  async loseOpportunity(
    @Req() req: IdentityRequest,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @Body() dto: LoseOpportunityDto,
  ) {
    return this.service.loseOpportunity(req.actor, opportunityId, dto, req.requestId ?? 'trace');
  }

  @Post('opportunities/:opportunityId/reopen')
  @HttpCode(200)
  @RequirePermission('opportunities:reopen', false)
  @ApiOkResponse({ type: OpportunityViewDto })
  async reopenOpportunity(
    @Req() req: IdentityRequest,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @Body() dto: ReopenOpportunityDto,
  ) {
    return this.service.reopenOpportunity(req.actor, opportunityId, dto, req.requestId ?? 'trace');
  }

  // ---------------------------------------------------------------------------
  // ACTIVITIES
  // ---------------------------------------------------------------------------

  @Get('activities')
  @RequirePermission('activities:manage', false)
  @ApiOkResponse({ type: [ActivityViewDto] })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'assigneeUserId', required: false, type: String })
  @ApiQuery({ name: 'opportunityId', required: false, type: String })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'dueFrom', required: false, type: String })
  @ApiQuery({ name: 'dueTo', required: false, type: String })
  @ApiQuery({ name: 'overdue', required: false, type: String })
  async listActivities(
    @Req() req: IdentityRequest,
    @Query('status') status?: string,
    @Query('assigneeUserId') assigneeUserId?: string,
    @Query('opportunityId') opportunityId?: string,
    @Query('customerId') customerId?: string,
    @Query('dueFrom') dueFrom?: string,
    @Query('dueTo') dueTo?: string,
    @Query('overdue') overdue?: string,
  ) {
    return this.service.listActivities(req.actor, {
      status,
      assigneeUserId,
      opportunityId,
      customerId,
      dueFrom,
      dueTo,
      overdue: overdue === 'true',
    });
  }

  @Post('activities')
  @RequirePermission('activities:manage', false)
  @ApiCreatedResponse({ type: ActivityViewDto })
  async createActivity(@Req() req: IdentityRequest, @Body() dto: CreateActivityDto) {
    return this.service.createActivity(req.actor, dto, req.requestId ?? 'trace');
  }

  @Post('activities/:activityId/complete')
  @HttpCode(200)
  @RequirePermission('activities:manage', false)
  @ApiOkResponse({ type: ActivityViewDto })
  async completeActivity(
    @Req() req: IdentityRequest,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() dto: CompleteActivityDto,
  ) {
    return this.service.completeActivity(req.actor, activityId, dto, req.requestId ?? 'trace');
  }

  @Post('activities/:activityId/reschedule')
  @HttpCode(200)
  @RequirePermission('activities:manage', false)
  @ApiOkResponse({ type: ActivityViewDto })
  async rescheduleActivity(
    @Req() req: IdentityRequest,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() dto: RescheduleActivityDto,
  ) {
    return this.service.rescheduleActivity(req.actor, activityId, dto, req.requestId ?? 'trace');
  }

  @Post('activities/:activityId/cancel')
  @HttpCode(200)
  @RequirePermission('activities:manage', false)
  @ApiBody({ type: ExpectedVersionDto })
  @ApiOkResponse({ type: ActivityViewDto })
  async cancelActivity(
    @Req() req: IdentityRequest,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() body: ExpectedVersionDto,
  ) {
    return this.service.cancelActivity(
      req.actor,
      activityId,
      body.expectedVersion,
      req.requestId ?? 'trace',
    );
  }
}

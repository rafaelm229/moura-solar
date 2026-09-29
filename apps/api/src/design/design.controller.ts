import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequirePermission, type IdentityRequest } from '../identity/identity.guard';
import { DesignService } from './design.service';
import {
  ApproveDesignVersionDto,
  CatalogItemViewDto,
  ConsumptionSummaryViewDto,
  CreateCatalogItemDto,
  CreateDesignDto,
  CreateDesignVersionDto,
  CreateEnergyReadingDto,
  CreateSurveyDto,
  DesignSuggestionViewDto,
  DesignVersionViewDto,
  DesignViewDto,
  EnergyReadingViewDto,
  SuggestDesignDto,
  SurveyViewDto,
  UpdateCatalogItemDto,
  UpdateDesignVersionDto,
} from './design.dto';

@ApiTags('design')
@ApiCookieAuth()
@Controller()
export class DesignController {
  constructor(private readonly service: DesignService) {}

  // ---------------------------------------------------------------------------
  // 1. HISTÓRICO DE CONSUMO (ENERGY READINGS)
  // ---------------------------------------------------------------------------

  @Get('utility-units/:id/readings')
  @RequirePermission('consumer_units:read')
  @ApiOkResponse({ type: ConsumptionSummaryViewDto })
  async getReadings(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ConsumptionSummaryViewDto> {
    return this.service.getReadings(req.actor, id);
  }

  @Post('utility-units/:id/readings')
  @RequirePermission('consumer_units:manage')
  @HttpCode(200)
  @ApiBody({ type: CreateEnergyReadingDto })
  @ApiOkResponse({ type: EnergyReadingViewDto })
  async createOrUpdateReading(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEnergyReadingDto,
  ): Promise<EnergyReadingViewDto> {
    return this.service.createOrUpdateReading(req.actor, id, dto, req.requestId);
  }

  @Delete('utility-units/:id/readings/:readingId')
  @RequirePermission('consumer_units:manage')
  @HttpCode(200)
  async deleteReading(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('readingId', ParseUUIDPipe) readingId: string,
  ): Promise<{ success: boolean }> {
    return this.service.deleteReading(req.actor, id, readingId, req.requestId);
  }

  // ---------------------------------------------------------------------------
  // 2. LEVANTAMENTO TÉCNICO (SURVEY)
  // ---------------------------------------------------------------------------

  @Get('opportunities/:id/surveys')
  @RequirePermission('surveys:read')
  @ApiOkResponse({ type: [SurveyViewDto] })
  async getSurveys(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SurveyViewDto[]> {
    return this.service.getSurveys(req.actor, id);
  }

  @Post('opportunities/:id/surveys')
  @RequirePermission('surveys:create')
  @HttpCode(200)
  @ApiBody({ type: CreateSurveyDto })
  @ApiOkResponse({ type: SurveyViewDto })
  async createOrUpdateSurvey(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSurveyDto,
  ): Promise<SurveyViewDto> {
    return this.service.createOrUpdateSurvey(req.actor, id, dto, req.requestId);
  }

  @Post('surveys/:id/complete')
  @RequirePermission('surveys:complete')
  @HttpCode(200)
  @ApiOkResponse({ type: SurveyViewDto })
  async completeSurvey(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SurveyViewDto> {
    return this.service.completeSurvey(req.actor, id, req.requestId);
  }

  // ---------------------------------------------------------------------------
  // 3. CATÁLOGO DE MATERIAIS E SERVIÇOS (CATALOG)
  // ---------------------------------------------------------------------------

  @Get('catalog')
  @RequirePermission('catalog:read')
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'kind', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiOkResponse({ type: [CatalogItemViewDto] })
  async listCatalog(
    @Req() req: IdentityRequest,
    @Query('category') category?: string,
    @Query('kind') kind?: string,
    @Query('status') status?: string,
  ): Promise<CatalogItemViewDto[]> {
    return this.service.listCatalog(req.actor, { category, kind, status });
  }

  @Post('catalog')
  @RequirePermission('catalog:manage')
  @HttpCode(200)
  @ApiBody({ type: CreateCatalogItemDto })
  @ApiOkResponse({ type: CatalogItemViewDto })
  async createCatalogItem(
    @Req() req: IdentityRequest,
    @Body() dto: CreateCatalogItemDto,
  ): Promise<CatalogItemViewDto> {
    return this.service.createCatalogItem(req.actor, dto, req.requestId);
  }

  @Put('catalog/:id')
  @RequirePermission('catalog:manage')
  @HttpCode(200)
  @ApiBody({ type: UpdateCatalogItemDto })
  @ApiOkResponse({ type: CatalogItemViewDto })
  async updateCatalogItem(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCatalogItemDto,
  ): Promise<CatalogItemViewDto> {
    return this.service.updateCatalogItem(req.actor, id, dto, req.requestId);
  }

  // ---------------------------------------------------------------------------
  // 4. SUGESTÃO E DIMENSIONAMENTO (DESIGN)
  // ---------------------------------------------------------------------------

  @Post('designs/suggest')
  @RequirePermission('designs:read')
  @HttpCode(200)
  @ApiBody({ type: SuggestDesignDto })
  @ApiOkResponse({ type: DesignSuggestionViewDto })
  async suggestDesign(
    @Req() req: IdentityRequest,
    @Body() dto: SuggestDesignDto,
  ): Promise<DesignSuggestionViewDto> {
    return this.service.suggestDesign(req.actor, dto);
  }

  @Get('opportunities/:id/designs')
  @RequirePermission('designs:read')
  @ApiOkResponse({ type: [DesignViewDto] })
  async getDesigns(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DesignViewDto[]> {
    return this.service.getDesigns(req.actor, id);
  }

  @Get('designs/:id')
  @RequirePermission('designs:read')
  @ApiOkResponse({ type: DesignViewDto })
  async getDesign(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DesignViewDto> {
    return this.service.getDesign(req.actor, id);
  }

  @Post('opportunities/:id/designs')
  @RequirePermission('designs:create')
  @HttpCode(200)
  @ApiBody({ type: CreateDesignDto })
  @ApiOkResponse({ type: DesignViewDto })
  async createDesign(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDesignDto,
  ): Promise<DesignViewDto> {
    return this.service.createDesign(req.actor, id, dto, req.requestId);
  }

  @Post('designs/:id/versions')
  @RequirePermission('designs:create')
  @HttpCode(200)
  @ApiBody({ type: CreateDesignVersionDto, required: false })
  @ApiOkResponse({ type: DesignVersionViewDto })
  async createDesignVersion(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto?: CreateDesignVersionDto,
  ): Promise<DesignVersionViewDto> {
    return this.service.createDesignVersion(req.actor, id, dto?.basedOnVersionId, req.requestId);
  }

  @Put('design-versions/:id')
  @RequirePermission('designs:update')
  @HttpCode(200)
  @ApiBody({ type: UpdateDesignVersionDto })
  @ApiOkResponse({ type: DesignVersionViewDto })
  async updateDesignVersion(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDesignVersionDto,
  ): Promise<DesignVersionViewDto> {
    return this.service.updateDesignVersion(req.actor, id, dto, req.requestId);
  }

  @Post('design-versions/:id/approve')
  @RequirePermission('designs:approve')
  @HttpCode(200)
  @ApiBody({ type: ApproveDesignVersionDto })
  @ApiOkResponse({ type: DesignVersionViewDto })
  async approveDesignVersion(
    @Req() req: IdentityRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveDesignVersionDto,
  ): Promise<DesignVersionViewDto> {
    return this.service.approveDesignVersion(req.actor, id, dto, req.requestId);
  }
}

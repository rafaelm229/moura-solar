import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiCreatedResponse,
  ApiBody,
  ApiCookieAuth,
  ApiHeader,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { TeamService } from './team.service';
import { Public, RequirePermission, type IdentityRequest } from './identity.guard';
import { cookieValue } from './security';
import { permissionCatalog } from './permission-catalog';
import {
  AcceptLinkDto,
  CandidateDto,
  AuditViewDto,
  BootstrapDto,
  CommandResultDto,
  ContextDto,
  InviteDto,
  LinkResultDto,
  LoginDto,
  MemberViewDto,
  RoleDto,
  RoleViewDto,
  SessionViewDto,
  TeamDto,
  TeamViewDto,
  UpdateMemberDto,
} from './identity.dto';

const Command = () =>
  ApiHeader({
    name: 'idempotency-key',
    required: true,
    description: 'UUID estável por comando; repetir com o mesmo conteúdo retorna o resultado.',
  });
@ApiTags('Identidade')
@ApiCookieAuth('ms_access')
@Controller('identity')
export class IdentityController {
  constructor(
    private readonly auth: AuthService,
    private readonly team: TeamService,
    private readonly config: ConfigService,
  ) {}
  private cookies(response: Response, tokens?: { access: string; refresh: string }) {
    const base = {
      httpOnly: true,
      sameSite: 'strict' as const,
      secure: this.config.get<string>('COOKIE_SECURE') === 'true',
      path: '/api/v1/identity',
    };
    if (!tokens) {
      response.clearCookie('ms_access', base);
      response.clearCookie('ms_refresh', base);
      return;
    }
    response.cookie('ms_access', tokens.access, { ...base, path: '/api/v1', maxAge: 900000 });
    response.cookie('ms_refresh', tokens.refresh, { ...base, maxAge: 2592000000 });
  }
  @Public()
  @Post('bootstrap')
  @ApiBody({ type: BootstrapDto })
  @ApiCreatedResponse({ type: CommandResultDto })
  bootstrap(
    @Body() input: BootstrapDto,
    @Headers('x-bootstrap-token') secret: string,
    @Req() req: IdentityRequest,
  ) {
    return this.auth.bootstrap(input, secret ?? '', req.requestId!);
  }
  @Public()
  @Post('login')
  @ApiBody({ type: LoginDto })
  @ApiCreatedResponse({ type: ContextDto })
  async login(
    @Body() input: LoginDto,
    @Req() req: IdentityRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.auth.login(
      input,
      req.header('user-agent') ?? 'Dispositivo',
      req.ip ?? 'unknown',
      req.requestId!,
    );
    this.cookies(response, tokens);
    return this.auth.context(tokens.access);
  }
  @Public()
  @Post('refresh')
  @ApiCreatedResponse({ type: ContextDto })
  async refresh(@Req() req: IdentityRequest, @Res({ passthrough: true }) response: Response) {
    const tokens = await this.auth.refresh(
      cookieValue(req.headers.cookie, 'ms_refresh'),
      req.requestId!,
    );
    this.cookies(response, tokens);
    return this.auth.context(tokens.access);
  }
  @Public()
  @Post('accept-link')
  @ApiBody({ type: AcceptLinkDto })
  @ApiCreatedResponse({ type: CommandResultDto })
  accept(@Body() input: AcceptLinkDto, @Req() req: IdentityRequest) {
    return this.auth.acceptLink(input, req.requestId!);
  }
  @Get('me') @ApiOkResponse({ type: ContextDto }) me(@Req() req: IdentityRequest) {
    return req.actor;
  }
  @Post('logout')
  @ApiCreatedResponse({ type: CommandResultDto })
  async logout(@Req() req: IdentityRequest, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.revoke(req.actor, req.actor.sessionId, req.requestId!);
    this.cookies(response);
    response.clearCookie('ms_access', { path: '/api/v1' });
    return result;
  }
  @Get('sessions')
  @RequirePermission('sessions:read_own', false)
  @ApiOkResponse({ type: [SessionViewDto] })
  sessions(@Req() req: IdentityRequest) {
    return this.auth.sessions(req.actor);
  }
  @Post('sessions/:id/revoke')
  @RequirePermission('sessions:revoke_own', false)
  @ApiCreatedResponse({ type: CommandResultDto })
  revoke(@Param('id', ParseUUIDPipe) id: string, @Req() req: IdentityRequest) {
    return this.auth.revoke(req.actor, id, req.requestId!);
  }
  @Get('members/:id/sessions')
  @RequirePermission('sessions:revoke_any')
  @ApiOkResponse({ type: [SessionViewDto] })
  memberSessions(@Param('id', ParseUUIDPipe) id: string, @Req() req: IdentityRequest) {
    return this.team.memberSessions(req.actor, id);
  }
  @Get('members')
  @RequirePermission('users:manage')
  @ApiOkResponse({ type: [MemberViewDto] })
  members(@Req() req: IdentityRequest) {
    return this.team.members(req.actor);
  }
  @Post('invitations')
  @RequirePermission('invitations:manage')
  @Command()
  @ApiBody({ type: InviteDto })
  @ApiCreatedResponse({ type: LinkResultDto })
  invite(
    @Body() input: InviteDto,
    @Headers('idempotency-key') key: string,
    @Req() req: IdentityRequest,
  ) {
    return this.team.invite(req.actor, input, key ?? '', req.requestId!);
  }
  @Patch('members/:id')
  @RequirePermission('users:manage')
  @Command()
  @ApiBody({ type: UpdateMemberDto })
  @ApiOkResponse({ type: CommandResultDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateMemberDto,
    @Headers('idempotency-key') key: string,
    @Req() req: IdentityRequest,
  ) {
    return this.team.updateMember(req.actor, id, input, key ?? '', req.requestId!);
  }
  @Post('members/:id/recovery')
  @RequirePermission('users:issue_recovery')
  @Command()
  @ApiCreatedResponse({ type: LinkResultDto })
  recovery(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') key: string,
    @Req() req: IdentityRequest,
  ) {
    return this.team.recovery(req.actor, id, key ?? '', req.requestId!);
  }
  @Get('roles') @RequirePermission('roles:manage') @ApiOkResponse({ type: [RoleViewDto] }) roles(
    @Req() req: IdentityRequest,
  ) {
    return this.team.roles(req.actor);
  }
  @Get('permissions')
  @RequirePermission('roles:manage')
  @ApiOkResponse({ type: [String] })
  permissions() {
    return permissionCatalog;
  }
  @Post('roles')
  @RequirePermission('roles:manage')
  @Command()
  @ApiBody({ type: RoleDto })
  @ApiCreatedResponse({ type: CommandResultDto })
  createRole(
    @Body() input: RoleDto,
    @Headers('idempotency-key') key: string,
    @Req() req: IdentityRequest,
  ) {
    return this.team.saveRole(req.actor, null, input, key ?? '', req.requestId!);
  }
  @Patch('roles/:id')
  @RequirePermission('roles:manage')
  @Command()
  @ApiBody({ type: RoleDto })
  @ApiOkResponse({ type: CommandResultDto })
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: RoleDto,
    @Headers('idempotency-key') key: string,
    @Req() req: IdentityRequest,
  ) {
    return this.team.saveRole(req.actor, id, input, key ?? '', req.requestId!);
  }
  @Get('team-candidates')
  @RequirePermission('teams:manage')
  @ApiOkResponse({ type: [CandidateDto] })
  candidates(@Req() req: IdentityRequest) {
    return this.team.candidates(req.actor);
  }
  @Get('teams') @RequirePermission('teams:manage') @ApiOkResponse({ type: [TeamViewDto] }) teams(
    @Req() req: IdentityRequest,
  ) {
    return this.team.teams(req.actor);
  }
  @Post('teams')
  @RequirePermission('teams:manage')
  @Command()
  @ApiBody({ type: TeamDto })
  @ApiCreatedResponse({ type: CommandResultDto })
  createTeam(
    @Body() input: TeamDto,
    @Headers('idempotency-key') key: string,
    @Req() req: IdentityRequest,
  ) {
    return this.team.saveTeam(req.actor, null, input, key ?? '', req.requestId!);
  }
  @Patch('teams/:id')
  @RequirePermission('teams:manage')
  @Command()
  @ApiBody({ type: TeamDto })
  @ApiOkResponse({ type: CommandResultDto })
  updateTeam(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: TeamDto,
    @Headers('idempotency-key') key: string,
    @Req() req: IdentityRequest,
  ) {
    return this.team.saveTeam(req.actor, id, input, key ?? '', req.requestId!);
  }
  @Get('audit')
  @RequirePermission('audit:read', false)
  @ApiOkResponse({ type: [AuditViewDto] })
  audit(@Req() req: IdentityRequest) {
    return this.team.audit(req.actor, req.requestId!);
  }
}

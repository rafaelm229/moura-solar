import { Injectable, SetMetadata, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { ContextDto } from './identity.dto';
import { AuthService } from './auth.service';
import { IdentityStore } from './identity.store';
import { cookieValue, fail } from './security';

export const Public = () => SetMetadata('identity.public', true);
export const RequirePermission = (permission: string, organization = true) =>
  SetMetadata('identity.permission', { permission, organization });
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata('identity.permissions', permissions);
export type IdentityRequest = Request & { actor: ContextDto };
@Injectable()
export class IdentityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly store: IdentityStore,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<IdentityRequest>();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      if (
        request.header('origin') !== this.config.get<string>('WEB_ORIGIN') ||
        request.header('x-requested-with') !== 'MouraSolar'
      )
        fail('CSRF_REJECTED', 'Origem da solicitação não autorizada.', 403);
    }
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>('identity.public', targets)) return true;
    request.actor = await this.auth.context(cookieValue(request.headers.cookie, 'ms_access'));
    const required = this.reflector.getAllAndOverride<{
      permission: string;
      organization: boolean;
    }>('identity.permission', targets);
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      'identity.permissions',
      targets,
    );
    const missingPermission = requiredPermissions?.find(
      (permission) => !request.actor.grants.some((grant) => grant.permission === permission),
    );
    const missingSinglePermission =
      required &&
      !request.actor.grants.some(
        (g) =>
          g.permission === required.permission &&
          (!required.organization || g.scope === 'organization'),
      )
        ? required.permission
        : undefined;
    const deniedPermission = missingPermission ?? missingSinglePermission;
    if (deniedPermission) {
      await this.store.audit(
        this.store.db,
        'identity.access_denied',
        request.actor,
        deniedPermission,
        request.requestId ?? 'unknown',
      );
      fail('ACCESS_DENIED', 'Você não tem permissão para esta ação.', 403);
    }
    return true;
  }
}

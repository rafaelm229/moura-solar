import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IdentityStore } from './identity.store';
import { deviceLabel, fail, hash, passwordHash, token, verifyPassword } from './security';
import { initialRoles, permissionCatalog } from './permission-catalog';
import type { AcceptLinkDto, BootstrapDto, ContextDto, LoginDto } from './identity.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly store: IdentityStore,
    private readonly config: ConfigService,
  ) {}

  async bootstrap(input: BootstrapDto, secret: string, traceId: string) {
    const configured = this.config.get<string>('BOOTSTRAP_TOKEN');
    if (!configured || hash(secret) !== hash(configured))
      fail('BOOTSTRAP_DENIED', 'Bootstrap indisponível.', 403);
    const password = await passwordHash(input.password);
    return this.store.transaction(async (tx) => {
      if (await tx.organization.count())
        fail('BOOTSTRAP_CLOSED', 'Organização já inicializada.', 409);
      const organization = await tx.organization.create({
        data: { name: input.organization, slug: 'moura-solar' },
      });
      await tx.permission.createMany({
        data: permissionCatalog.map((key) => ({ key })),
        skipDuplicates: true,
      });
      let administrator = '';
      for (const [name, grants] of Object.entries(initialRoles)) {
        const role = await tx.role.create({
          data: { name, organizationId: organization.id, grants: { create: grants } },
        });
        if (name === 'Administrador') administrator = role.id;
      }
      const user = await tx.user.create({
        data: { email: input.email.toLowerCase().trim(), name: input.name, passwordHash: password },
      });
      const member = await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          roleId: administrator,
          status: 'active',
        },
      });
      await this.store.audit(tx, 'identity.bootstrap', member, member.id, traceId);
      return { id: member.id };
    });
  }

  async login(input: LoginDto, device: string, address: string, traceId: string) {
    const email = input.email.toLowerCase().trim();
    // Both counters are stored centrally and increment before expensive password verification.
    const permitted = await this.store.transaction(async (tx) => {
      const now = new Date();
      for (const [key, limit] of [
        [hash(`email:${email}`), Number(process.env.LOGIN_RATE_LIMIT_EMAIL ?? 10)],
        [hash(`ip:${address}`), Number(process.env.LOGIN_RATE_LIMIT_IP ?? 60)],
      ] as const) {
        const counter = await tx.loginThrottle.findUnique({ where: { key } });
        if (counter && counter.resetAt > now && counter.attempts >= limit) return false;
        await tx.loginThrottle.upsert({
          where: { key },
          create: { key, attempts: 1, resetAt: new Date(Date.now() + 900000) },
          update:
            counter && counter.resetAt > now
              ? { attempts: { increment: 1 } }
              : { attempts: 1, resetAt: new Date(Date.now() + 900000) },
        });
      }
      return true;
    });
    if (!permitted) fail('LOGIN_RATE_LIMITED', 'Muitas tentativas. Aguarde 15 minutos.', 429);
    const user = await this.store.db.user.findUnique({
      where: { email },
      include: { memberships: true },
    });
    const valid = await verifyPassword(input.password, user?.passwordHash ?? null);
    const member = user?.memberships.find((item) => item.status === 'active');
    if (!valid || !member) {
      await this.store.audit(this.store.db, 'identity.login_failed', null, null, traceId);
      fail('INVALID_CREDENTIALS', 'E-mail ou senha inválidos.', 401);
    }
    const access = token();
    const refresh = token();
    await this.store.transaction(async (tx) => {
      const current = await tx.membership.findUnique({
        where: { id: member.id },
        include: { user: true },
      });
      if (current?.status !== 'active' || current.user.passwordHash !== user?.passwordHash)
        fail('INVALID_CREDENTIALS', 'E-mail ou senha inválidos.', 401);
      const session = await tx.session.create({
        data: {
          membershipId: member.id,
          device: deviceLabel(device),
          accessHash: hash(access),
          accessExpiresAt: new Date(Date.now() + 900000),
          expiresAt: new Date(Date.now() + 2592000000),
          refreshTokens: { create: { hash: hash(refresh) } },
        },
      });
      await this.store.audit(tx, 'identity.login', member, session.id, traceId);
    });
    return { access, refresh };
  }

  async refresh(value: string, traceId: string) {
    const access = token();
    const refresh = token();
    const result = await this.store.transaction(async (tx) => {
      const previous = await tx.refreshToken.findUnique({
        where: { hash: hash(value) },
        include: { session: { include: { membership: true } } },
      });
      if (!previous) return false;
      const session = previous.session;
      if (previous.usedAt) {
        await tx.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
        await this.store.audit(
          tx,
          'identity.refresh_reuse',
          session.membership,
          session.id,
          traceId,
        );
        return false;
      }
      if (
        session.revokedAt ||
        session.expiresAt <= new Date() ||
        session.membership.status !== 'active'
      )
        return false;
      await tx.refreshToken.update({
        where: { hash: previous.hash },
        data: { usedAt: new Date() },
      });
      await tx.session.update({
        where: { id: session.id },
        data: {
          accessHash: hash(access),
          accessExpiresAt: new Date(Date.now() + 900000),
          lastSeenAt: new Date(),
          refreshTokens: { create: { hash: hash(refresh) } },
        },
      });
      await this.store.audit(tx, 'identity.refresh', session.membership, session.id, traceId);
      return true;
    });
    if (!result) fail('SESSION_INVALID', 'Sessão encerrada. Entre novamente.', 401);
    return { access, refresh };
  }

  async context(access: string): Promise<ContextDto> {
    const session = await this.store.db.session.findUnique({
      where: { accessHash: hash(access) },
      include: {
        membership: {
          include: {
            user: true,
            organization: true,
            role: { include: { grants: true } },
            teams: true,
          },
        },
      },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.membership.status !== 'active'
    )
      fail('SESSION_INVALID', 'Sessão encerrada. Entre novamente.', 401);
    if (session.accessExpiresAt <= new Date()) fail('ACCESS_EXPIRED', 'Renove sua sessão.', 401);
    const m = session.membership;
    return {
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      roleId: m.roleId,
      roleName: m.role.name,
      status: m.status,
      version: m.version,
      organizationId: m.organizationId,
      organizationName: m.organization.name,
      sessionId: session.id,
      grants: m.role.grants.map(({ permission, scope }) => ({ permission, scope })),
      teamIds: m.teams.map((t) => t.teamId),
    };
  }

  async acceptLink(input: AcceptLinkDto, traceId: string) {
    // Fast reject invalid tokens before the expensive password hash.
    const found = await this.store.db.accessLink.findUnique({ where: { hash: hash(input.token) } });
    if (!found || found.usedAt || found.expiresAt <= new Date())
      fail('LINK_INVALID', 'Link inválido, usado ou expirado. Solicite outro ao administrador.');
    const password = await passwordHash(input.password);
    return this.store.transaction(async (tx) => {
      const link = await tx.accessLink.findUnique({
        where: { id: found.id },
        include: { membership: true },
      });
      if (
        !link ||
        link.usedAt ||
        link.expiresAt <= new Date() ||
        link.membership.status === 'blocked'
      )
        fail('LINK_INVALID', 'Link inválido, usado ou expirado.');
      const member = link.membership;
      await tx.user.update({ where: { id: member.userId }, data: { passwordHash: password } });
      await tx.membership.update({
        where: { id: member.id },
        data: { status: 'active', version: { increment: 1 } },
      });
      await tx.accessLink.updateMany({
        where: { membership: { userId: member.userId }, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.session.updateMany({
        where: { membership: { userId: member.userId }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.store.audit(tx, `identity.${link.kind}_accepted`, member, member.id, traceId);
      return { id: member.id };
    });
  }

  async sessions(actor: ContextDto) {
    return (
      await this.store.db.session.findMany({
        where: { membershipId: actor.id, revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      })
    ).map((s) => ({
      id: s.id,
      device: s.device,
      current: s.id === actor.sessionId,
      createdAt: s.createdAt.toISOString(),
      lastSeenAt: s.lastSeenAt.toISOString(),
    }));
  }
  async revoke(actor: ContextDto, id: string, traceId: string) {
    return this.store.transaction(async (tx) => {
      const session = await tx.session.findFirst({
        where: { id, membership: { organizationId: actor.organizationId } },
      });
      if (!session) fail('SESSION_NOT_FOUND', 'Sessão não encontrada.', 404);
      if (session.membershipId !== actor.id)
        await this.store.authorize(tx, actor, 'sessions:revoke_any');
      if (!session.revokedAt) {
        await tx.session.update({ where: { id }, data: { revokedAt: new Date() } });
        await this.store.audit(
          tx,
          id === actor.sessionId ? 'identity.logout' : 'identity.session_revoked',
          actor,
          id,
          traceId,
        );
      }
      return { id };
    });
  }
}

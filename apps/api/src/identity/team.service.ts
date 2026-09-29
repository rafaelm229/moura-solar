import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { IdentityStore } from './identity.store';
import { fail, hash } from './security';
import { permissionCatalog } from './permission-catalog';
import type { ContextDto, InviteDto, RoleDto, TeamDto, UpdateMemberDto } from './identity.dto';

@Injectable()
export class TeamService {
  constructor(
    private readonly store: IdentityStore,
    private readonly config: ConfigService,
  ) {}
  async memberSessions(actor: ContextDto, id: string) {
    const member = await this.store.db.membership.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!member) fail('USER_NOT_FOUND', 'Pessoa não encontrada.', 404);
    const rows = await this.store.db.session.findMany({
      where: { membershipId: id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((s) => ({
      id: s.id,
      device: s.device,
      current: s.id === actor.sessionId,
      createdAt: s.createdAt.toISOString(),
      lastSeenAt: s.lastSeenAt.toISOString(),
    }));
  }
  async candidates(actor: ContextDto) {
    const rows = await this.store.db.membership.findMany({
      where: { organizationId: actor.organizationId },
      select: { id: true, user: { select: { name: true } } },
    });
    return rows.map((m) => ({ id: m.id, name: m.user.name }));
  }
  members(actor: ContextDto) {
    return this.store.db.membership
      .findMany({
        where: { organizationId: actor.organizationId },
        include: { user: true, role: true },
        orderBy: { createdAt: 'asc' },
        take: 500,
      })
      .then((rows) =>
        rows.map((m) => ({
          id: m.id,
          name: m.user.name,
          email: m.user.email,
          roleId: m.roleId,
          roleName: m.role.name,
          status: m.status,
          version: m.version,
        })),
      );
  }
  roles(actor: ContextDto) {
    return this.store.db.role.findMany({
      where: { organizationId: actor.organizationId },
      include: { grants: { select: { permission: true, scope: true } } },
      orderBy: { name: 'asc' },
    });
  }
  teams(actor: ContextDto) {
    return this.store.db.team
      .findMany({
        where: { organizationId: actor.organizationId },
        include: { members: true },
        orderBy: { name: 'asc' },
      })
      .then((rows) =>
        rows.map((t) => ({
          id: t.id,
          name: t.name,
          version: t.version,
          memberIds: t.members.map((m) => m.membershipId),
        })),
      );
  }
  private linkToken(actor: ContextDto, key: string): string {
    return createHmac('sha256', this.config.getOrThrow<string>('IDENTITY_LINK_SECRET'))
      .update(`${actor.organizationId}:${actor.id}:${key}`)
      .digest('base64url');
  }
  async invite(actor: ContextDto, input: InviteDto, key: string, traceId: string) {
    const secret = this.linkToken(actor, key);
    const result = await this.store.command(
      actor,
      key,
      ['invite', input],
      'invitations:manage',
      async (tx) => {
        const role = await tx.role.findFirst({
          where: { id: input.roleId, organizationId: actor.organizationId },
        });
        if (!role) fail('ROLE_NOT_FOUND', 'Papel não encontrado.', 404);
        const email = input.email.toLowerCase().trim();
        if (await tx.user.findUnique({ where: { email } }))
          fail('USER_EXISTS', 'Usuário já cadastrado. Use recuperação de acesso.', 409);
        const user = await tx.user.create({ data: { email, name: input.name } });
        const member = await tx.membership.create({
          data: { organizationId: actor.organizationId, userId: user.id, roleId: role.id },
        });
        const expiresAt = new Date(Date.now() + 86400000);
        await tx.accessLink.create({
          data: { membershipId: member.id, hash: hash(secret), kind: 'invitation', expiresAt },
        });
        await this.store.audit(tx, 'identity.invited', actor, member.id, traceId);
        return { id: member.id, expiresAt: expiresAt.toISOString() };
      },
    );
    return { ...result, token: secret };
  }
  async recovery(actor: ContextDto, id: string, key: string, traceId: string) {
    const secret = this.linkToken(actor, key);
    const result = await this.store.command(
      actor,
      key,
      ['recovery', id],
      'users:issue_recovery',
      async (tx) => {
        const member = await tx.membership.findFirst({
          where: { id, organizationId: actor.organizationId },
        });
        if (!member) fail('USER_NOT_FOUND', 'Pessoa não encontrada.', 404);
        if (member.status === 'blocked')
          fail('USER_BLOCKED', 'Desbloqueie a pessoa antes de recuperar o acesso.', 409);
        await tx.accessLink.updateMany({
          where: { membershipId: id, usedAt: null },
          data: { usedAt: new Date() },
        });
        const expiresAt = new Date(Date.now() + 3600000);
        await tx.accessLink.create({
          data: {
            membershipId: id,
            hash: hash(secret),
            kind: member.status === 'invited' ? 'invitation' : 'recovery',
            expiresAt,
          },
        });
        await this.store.audit(tx, 'identity.recovery_issued', actor, id, traceId);
        return { id, expiresAt: expiresAt.toISOString() };
      },
    );
    return { ...result, token: secret };
  }
  updateMember(
    actor: ContextDto,
    id: string,
    input: UpdateMemberDto,
    key: string,
    traceId: string,
  ) {
    return this.store.command(actor, key, ['member', id, input], 'users:manage', async (tx) => {
      const member = await tx.membership.findFirst({
        where: { id, organizationId: actor.organizationId },
      });
      const role = await tx.role.findFirst({
        where: { id: input.roleId, organizationId: actor.organizationId },
      });
      if (!member || !role) fail('USER_NOT_FOUND', 'Pessoa ou papel não encontrado.', 404);
      if (member.status === 'invited' && input.status === 'active')
        fail('INVITATION_PENDING', 'A pessoa deve aceitar o convite.', 409);
      const changed = await tx.membership.updateMany({
        where: { id, version: input.version },
        data: { roleId: input.roleId, status: input.status, version: { increment: 1 } },
      });
      if (!changed.count)
        fail('VERSION_CONFLICT', 'Este cadastro mudou. Atualize antes de salvar.', 409);
      await this.store.requireAdministrator(tx, actor.organizationId);
      await tx.session.updateMany({
        where: { membershipId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (input.status === 'blocked')
        await tx.accessLink.updateMany({
          where: { membershipId: id, usedAt: null },
          data: { usedAt: new Date() },
        });
      await this.store.audit(tx, 'identity.member_updated', actor, id, traceId);
      return { id };
    });
  }
  saveRole(actor: ContextDto, id: string | null, input: RoleDto, key: string, traceId: string) {
    const allowed = new Set<string>(permissionCatalog);
    if (
      input.grants.some((grant) => !allowed.has(grant.permission)) ||
      new Set(input.grants.map((g) => g.permission)).size !== input.grants.length
    )
      fail('INVALID_GRANTS', 'Permissões desconhecidas ou duplicadas.');
    return this.store.command(actor, key, ['role', id, input], 'roles:manage', async (tx) => {
      let roleId = id;
      if (roleId) {
        const changed = await tx.role.updateMany({
          where: { id: roleId, organizationId: actor.organizationId, version: input.version ?? -1 },
          data: { name: input.name, version: { increment: 1 } },
        });
        if (!changed.count)
          fail('VERSION_CONFLICT', 'O papel mudou ou não existe. Atualize antes de salvar.', 409);
        await tx.roleGrant.deleteMany({ where: { roleId } });
        await tx.roleGrant.createMany({
          data: input.grants.map((grant) => ({ ...grant, roleId: roleId! })),
        });
      } else {
        const role = await tx.role.create({
          data: {
            organizationId: actor.organizationId,
            name: input.name,
            grants: { create: input.grants },
          },
        });
        roleId = role.id;
      }
      await this.store.requireAdministrator(tx, actor.organizationId);
      await tx.session.updateMany({
        where: { membership: { roleId }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.store.audit(tx, 'identity.role_saved', actor, roleId, traceId);
      return { id: roleId };
    });
  }
  saveTeam(actor: ContextDto, id: string | null, input: TeamDto, key: string, traceId: string) {
    return this.store.command(actor, key, ['team', id, input], 'teams:manage', async (tx) => {
      const count = await tx.membership.count({
        where: { id: { in: input.memberIds }, organizationId: actor.organizationId },
      });
      if (count !== input.memberIds.length)
        fail('INVALID_TEAM', 'Membros devem pertencer à organização.');
      let teamId = id;
      if (teamId) {
        const changed = await tx.team.updateMany({
          where: { id: teamId, organizationId: actor.organizationId, version: input.version ?? -1 },
          data: { name: input.name, version: { increment: 1 } },
        });
        if (!changed.count)
          fail('VERSION_CONFLICT', 'A equipe mudou ou não existe. Atualize antes de salvar.', 409);
        await tx.teamMember.deleteMany({ where: { teamId } });
        await tx.teamMember.createMany({
          data: input.memberIds.map((membershipId) => ({ teamId: teamId!, membershipId })),
        });
      } else {
        const team = await tx.team.create({
          data: {
            organizationId: actor.organizationId,
            name: input.name,
            members: { create: input.memberIds.map((membershipId) => ({ membershipId })) },
          },
        });
        teamId = team.id;
      }
      await this.store.audit(tx, 'identity.team_saved', actor, teamId, traceId);
      return { id: teamId };
    });
  }
  async audit(actor: ContextDto, traceId: string) {
    const scope = actor.grants.find((g) => g.permission === 'audit:read')?.scope;
    let where: Prisma.AuditEventWhereInput = { organizationId: actor.organizationId };
    if (scope === 'own') where.actorId = actor.id;
    else if (scope === 'team') {
      const members = await this.store.db.teamMember.findMany({
        where: {
          teamId: { in: actor.teamIds },
          membership: { organizationId: actor.organizationId },
        },
      });
      where.actorId = { in: members.map((m) => m.membershipId) };
    } else if (scope !== 'organization') {
      // M1 only emits identity events. Domain-scoped readers cannot inspect them.
      where.id = { in: [] };
    }
    const events = await this.store.db.auditEvent.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    await this.store.audit(this.store.db, 'identity.audit_read', actor, null, traceId);
    return events.map((e) => ({
      id: e.id,
      action: e.action,
      actorId: e.actorId,
      entityId: e.entityId,
      traceId: e.traceId,
      createdAt: e.createdAt.toISOString(),
    }));
  }
}

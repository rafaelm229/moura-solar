import { describe, expect, it } from 'vitest';
import { canAccess } from '../src/identity/identity.policy';
import { initialRoles, permissionCatalog } from '../src/identity/permission-catalog';
import type { ContextDto } from '../src/identity/identity.dto';
const actor = { id: 'member', organizationId: 'org', teamIds: ['team'] } as ContextDto;
describe('approved authorization matrix', () => {
  for (const [role, grants] of Object.entries(initialRoles)) {
    for (const permission of permissionCatalog) {
      it(`${role}: ${permission} honors grant and organization boundary`, () => {
        const context = { ...actor, grants };
        const resource = {
          organizationId: 'org',
          ownerId: 'member',
          teamIds: ['team'],
          assigneeIds: ['member'],
          linkedMemberIds: ['member'],
          domain: 'identity',
        };
        const scope = grants.find((grant) => grant.permission === permission)?.scope;
        const expected = !!scope && scope !== 'domain';
        expect(canAccess(context, permission, resource)).toBe(expected);
        expect(canAccess(context, permission, { ...resource, organizationId: 'another' })).toBe(
          false,
        );
        if (scope && scope !== 'organization')
          expect(canAccess(context, permission, { organizationId: 'org' })).toBe(false);
      });
    }
  }
});

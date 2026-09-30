import type { ContextDto } from './identity.dto';

export interface ResourceContext {
  organizationId: string;
  ownerId?: string;
  teamIds?: string[];
  assigneeIds?: string[];
  linkedMemberIds?: string[];
  domain?: string;
}
// Resource contexts are supplied by server-side domain repositories, never by request bodies.
export function canAccess(
  actor: ContextDto,
  permission: string,
  resource: ResourceContext,
): boolean {
  if (actor.organizationId !== resource.organizationId) return false;
  const scope = actor.grants.find((grant) => grant.permission === permission)?.scope;
  switch (scope) {
    case 'organization':
      return true;
    case 'own':
      return resource.ownerId === actor.id;
    case 'team':
      return !!resource.teamIds?.some((id) => actor.teamIds.includes(id));
    case 'assigned':
      return (
        !!resource.assigneeIds?.includes(actor.id) ||
        !!resource.teamIds?.some((id) => actor.teamIds.includes(id))
      );
    case 'linked':
      return !!resource.linkedMemberIds?.includes(actor.id);
    case 'domain':
      return (
        !!resource.domain &&
        actor.grants.some(
          (grant) =>
            grant.permission.startsWith(`${resource.domain}:`) && grant.permission !== 'audit:read',
        )
      );
    default:
      return false;
  }
}

import type { Prisma } from '@prisma/client';
import type { Actor } from './dossier.dto';
import { fail } from '../identity/security';

export const sensitiveCategories = ['IDENTITY', 'CORPORATE', 'REPRESENTATION'];
export const photoCategories = ['PHOTO_BEFORE', 'PHOTO_DURING', 'PHOTO_AFTER'];
export const organizationGrant = (actor: Actor, permission: string) =>
  actor.grants.some((grant) => grant.permission === permission && grant.scope === 'organization');

export function documentScope(actor: Actor, permission: string): Prisma.DossierDocumentWhereInput {
  const grants = actor.grants.filter((grant) => grant.permission === permission);
  if (!grants.length) fail('ACCESS_DENIED', 'Você não tem permissão para esta ação.', 403);
  const category = organizationGrant(actor, 'documents:identity_read')
    ? {}
    : { category: { notIn: sensitiveCategories } };
  if (organizationGrant(actor, permission))
    return { organizationId: actor.organizationId, ...category };
  const scopes: Prisma.DossierDocumentWhereInput[] = [];
  if (grants.some((g) => g.scope === 'assigned' || g.scope === 'team')) {
    scopes.push({
      category: { in: photoCategories },
      workOrderLinks: {
        some: {
          workOrder: {
            organizationId: actor.organizationId,
            OR: [{ assignedLeaderId: actor.userId }, { assignedTeamId: { in: actor.teamIds } }],
          },
        },
      },
    });
  }
  if (grants.some((g) => g.scope === 'own')) {
    scopes.push({
      opportunityLinks: {
        some: {
          opportunity: {
            organizationId: actor.organizationId,
            ownerUserId: actor.userId,
          },
        },
      },
    });
  }
  return { organizationId: actor.organizationId, AND: [category, { OR: scopes }] };
}

export function customerScope(actor: Actor, permission: string): Prisma.CustomerWhereInput {
  const grants = actor.grants.filter((g) => g.permission === permission);
  if (organizationGrant(actor, permission)) return { organizationId: actor.organizationId };
  const contexts: Prisma.CustomerWhereInput[] = [];
  if (grants.some((g) => g.scope === 'assigned' || g.scope === 'team'))
    contexts.push({
      opportunities: {
        some: {
          organizationId: actor.organizationId,
          operationalProject: {
            workOrders: {
              some: {
                organizationId: actor.organizationId,
                OR: [{ assignedLeaderId: actor.userId }, { assignedTeamId: { in: actor.teamIds } }],
              },
            },
          },
        },
      },
    });
  if (grants.some((g) => g.scope === 'own'))
    contexts.push({
      opportunities: { some: { organizationId: actor.organizationId, ownerUserId: actor.userId } },
    });
  return { organizationId: actor.organizationId, OR: contexts };
}

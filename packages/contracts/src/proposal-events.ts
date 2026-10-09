import { parseIntegrationEvent, type IntegrationEvent } from './integration-event.js';

export type ProposalCreatedEventV1 = IntegrationEvent<{
  proposalId: string;
  proposalVersionId: string;
  opportunityId: string;
}> & {
  eventType: 'PROPOSAL_CREATED';
  schemaVersion: 1;
};

export type ProposalAcceptedEventV1 = IntegrationEvent<{
  acceptanceId: string;
  proposalVersionId: string;
  opportunityId: string;
}> & {
  eventType: 'PROPOSAL_ACCEPTED';
  schemaVersion: 1;
};

function hasIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Validates the versioned proposal-created contract without commercial snapshots. */
export function parseProposalCreatedEventV1(value: unknown): ProposalCreatedEventV1 {
  const event = parseIntegrationEvent(value);

  if (event.eventType !== 'PROPOSAL_CREATED') {
    throw new TypeError('Proposal event eventType is unsupported');
  }
  if (event.schemaVersion !== 1) {
    throw new TypeError('Proposal event schemaVersion is unsupported');
  }

  for (const field of ['proposalId', 'proposalVersionId', 'opportunityId'] as const) {
    if (!hasIdentifier(event.payload[field])) {
      throw new TypeError(`Proposal event payload ${field} is required`);
    }
  }
  if (event.payload.proposalId !== event.aggregateId) {
    throw new TypeError('Proposal event payload proposalId must match aggregateId');
  }
  if (
    Object.keys(event.payload).some(
      (field) => !['proposalId', 'proposalVersionId', 'opportunityId'].includes(field),
    )
  ) {
    throw new TypeError('Proposal event payload contains unsupported fields');
  }

  return event as ProposalCreatedEventV1;
}

/** Validates the versioned proposal-accepted contract; it does not publish or consume events. */
export function parseProposalAcceptedEventV1(value: unknown): ProposalAcceptedEventV1 {
  const event = parseIntegrationEvent(value);

  if (event.eventType !== 'PROPOSAL_ACCEPTED') {
    throw new TypeError('Proposal event eventType is unsupported');
  }
  if (event.schemaVersion !== 1) {
    throw new TypeError('Proposal event schemaVersion is unsupported');
  }

  for (const field of ['acceptanceId', 'proposalVersionId', 'opportunityId'] as const) {
    if (!hasIdentifier(event.payload[field])) {
      throw new TypeError(`Proposal event payload ${field} is required`);
    }
  }

  return event as ProposalAcceptedEventV1;
}

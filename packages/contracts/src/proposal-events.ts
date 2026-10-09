import { parseIntegrationEvent, type IntegrationEvent } from './integration-event.js';

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

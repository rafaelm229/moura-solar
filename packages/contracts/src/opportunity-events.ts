import { parseIntegrationEvent, type IntegrationEvent } from './integration-event.js';

export type OpportunityCreatedEventV1 = IntegrationEvent<{
  opportunityId: string;
  customerId: string;
  utilityUnitId?: string;
}> & {
  eventType: 'OPPORTUNITY_CREATED';
  schemaVersion: 1;
};

function hasIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Validates the minimal opportunity-created contract without commercial text. */
export function parseOpportunityCreatedEventV1(value: unknown): OpportunityCreatedEventV1 {
  const event = parseIntegrationEvent(value);

  if (event.eventType !== 'OPPORTUNITY_CREATED') {
    throw new TypeError('Opportunity event eventType is unsupported');
  }
  if (event.schemaVersion !== 1) {
    throw new TypeError('Opportunity event schemaVersion is unsupported');
  }
  if (!hasIdentifier(event.payload.opportunityId)) {
    throw new TypeError('Opportunity event payload opportunityId is required');
  }
  if (event.payload.opportunityId !== event.aggregateId) {
    throw new TypeError('Opportunity event payload opportunityId must match aggregateId');
  }
  if (!hasIdentifier(event.payload.customerId)) {
    throw new TypeError('Opportunity event payload customerId is required');
  }
  if (event.payload.utilityUnitId !== undefined && !hasIdentifier(event.payload.utilityUnitId)) {
    throw new TypeError('Opportunity event payload utilityUnitId must be nonempty');
  }
  if (
    Object.keys(event.payload).some(
      (field) => !['opportunityId', 'customerId', 'utilityUnitId'].includes(field),
    )
  ) {
    throw new TypeError('Opportunity event payload contains unsupported fields');
  }

  return event as OpportunityCreatedEventV1;
}

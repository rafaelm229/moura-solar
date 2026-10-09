import { parseIntegrationEvent, type IntegrationEvent } from './integration-event.js';

export type OpportunityCreatedEventV1 = IntegrationEvent<{
  opportunityId: string;
  customerId: string;
  utilityUnitId?: string;
}> & {
  eventType: 'OPPORTUNITY_CREATED';
  schemaVersion: 1;
};

export type OpportunityQualifiedEventV1 = IntegrationEvent<{
  opportunityId: string;
  transitionId: string;
  customerId: string;
  fromState: 'NOVO';
  toState: 'QUALIFICADO';
}> & {
  eventType: 'OPPORTUNITY_QUALIFIED';
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

/** Validates a minimal opportunity qualification transition without commercial text. */
export function parseOpportunityQualifiedEventV1(value: unknown): OpportunityQualifiedEventV1 {
  const event = parseIntegrationEvent(value);

  if (event.eventType !== 'OPPORTUNITY_QUALIFIED') {
    throw new TypeError('Opportunity event eventType is unsupported');
  }
  if (event.schemaVersion !== 1) {
    throw new TypeError('Opportunity event schemaVersion is unsupported');
  }

  for (const field of ['opportunityId', 'transitionId', 'customerId'] as const) {
    if (!hasIdentifier(event.payload[field])) {
      throw new TypeError(`Opportunity event payload ${field} is required`);
    }
  }
  if (event.payload.opportunityId !== event.aggregateId) {
    throw new TypeError('Opportunity event payload opportunityId must match aggregateId');
  }
  if (event.payload.fromState !== 'NOVO' || event.payload.toState !== 'QUALIFICADO') {
    throw new TypeError('Opportunity event payload transition states are unsupported');
  }
  if (
    Object.keys(event.payload).some(
      (field) =>
        !['opportunityId', 'transitionId', 'customerId', 'fromState', 'toState'].includes(field),
    )
  ) {
    throw new TypeError('Opportunity event payload contains unsupported fields');
  }

  return event as OpportunityQualifiedEventV1;
}

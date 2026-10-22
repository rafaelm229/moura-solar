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

export type OpportunityLostEventV1 = IntegrationEvent<{
  opportunityId: string;
  transitionId: string;
  fromState: string;
  toState: 'PERDIDO';
}> & {
  eventType: 'OPPORTUNITY_LOST';
  schemaVersion: 1;
};

export type OpportunityReopenedEventV1 = IntegrationEvent<{
  opportunityId: string;
  transitionId: string;
  fromState: 'PERDIDO' | 'CANCELADO';
  toState: 'NOVO';
}> & {
  eventType: 'OPPORTUNITY_REOPENED';
  schemaVersion: 1;
};

export type OpportunityUpdatedEventV1 = IntegrationEvent<{
  opportunityId: string;
  customerId: string;
  auditEventId: string;
}> & {
  eventType: 'OPPORTUNITY_UPDATED';
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

/** Validates a minimal opportunity-loss transition without loss reason or notes. */
export function parseOpportunityLostEventV1(value: unknown): OpportunityLostEventV1 {
  const event = parseIntegrationEvent(value);

  if (event.eventType !== 'OPPORTUNITY_LOST') {
    throw new TypeError('Opportunity event eventType is unsupported');
  }
  if (event.schemaVersion !== 1) {
    throw new TypeError('Opportunity event schemaVersion is unsupported');
  }
  for (const field of ['opportunityId', 'transitionId'] as const) {
    if (!hasIdentifier(event.payload[field])) {
      throw new TypeError(`Opportunity event payload ${field} is required`);
    }
  }
  if (event.payload.opportunityId !== event.aggregateId) {
    throw new TypeError('Opportunity event payload opportunityId must match aggregateId');
  }
  if (!hasIdentifier(event.payload.fromState)) {
    throw new TypeError('Opportunity event payload fromState is required');
  }
  if (event.payload.toState !== 'PERDIDO') {
    throw new TypeError('Opportunity event payload toState is unsupported');
  }
  if (
    Object.keys(event.payload).some(
      (field) => !['opportunityId', 'transitionId', 'fromState', 'toState'].includes(field),
    )
  ) {
    throw new TypeError('Opportunity event payload contains unsupported fields');
  }

  return event as OpportunityLostEventV1;
}

/** Validates a minimal, permissioned opportunity-reopen transition without justification text. */
export function parseOpportunityReopenedEventV1(value: unknown): OpportunityReopenedEventV1 {
  const event = parseIntegrationEvent(value);

  if (event.eventType !== 'OPPORTUNITY_REOPENED') {
    throw new TypeError('Opportunity event eventType is unsupported');
  }
  if (event.schemaVersion !== 1) {
    throw new TypeError('Opportunity event schemaVersion is unsupported');
  }
  for (const field of ['opportunityId', 'transitionId'] as const) {
    if (!hasIdentifier(event.payload[field])) {
      throw new TypeError(`Opportunity event payload ${field} is required`);
    }
  }
  if (event.payload.opportunityId !== event.aggregateId) {
    throw new TypeError('Opportunity event payload opportunityId must match aggregateId');
  }
  if (!['PERDIDO', 'CANCELADO'].includes(String(event.payload.fromState))) {
    throw new TypeError('Opportunity event payload fromState is unsupported');
  }
  if (event.payload.toState !== 'NOVO') {
    throw new TypeError('Opportunity event payload toState is unsupported');
  }
  if (
    Object.keys(event.payload).some(
      (field) => !['opportunityId', 'transitionId', 'fromState', 'toState'].includes(field),
    )
  ) {
    throw new TypeError('Opportunity event payload contains unsupported fields');
  }

  return event as OpportunityReopenedEventV1;
}

/** Validates a minimal opportunity update without commercial text or values. */
export function parseOpportunityUpdatedEventV1(value: unknown): OpportunityUpdatedEventV1 {
  const event = parseIntegrationEvent(value);

  if (event.eventType !== 'OPPORTUNITY_UPDATED') {
    throw new TypeError('Opportunity event eventType is unsupported');
  }
  if (event.schemaVersion !== 1) {
    throw new TypeError('Opportunity event schemaVersion is unsupported');
  }
  for (const field of ['opportunityId', 'customerId', 'auditEventId'] as const) {
    if (!hasIdentifier(event.payload[field])) {
      throw new TypeError(`Opportunity event payload ${field} is required`);
    }
  }
  if (event.payload.opportunityId !== event.aggregateId) {
    throw new TypeError('Opportunity event payload opportunityId must match aggregateId');
  }
  if (
    Object.keys(event.payload).some(
      (field) => !['opportunityId', 'customerId', 'auditEventId'].includes(field),
    )
  ) {
    throw new TypeError('Opportunity event payload contains unsupported fields');
  }

  return event as OpportunityUpdatedEventV1;
}

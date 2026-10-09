import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  parseOpportunityCreatedEventV1,
  parseOpportunityLostEventV1,
  parseOpportunityQualifiedEventV1,
} from '../dist/index.js';

function validEvent() {
  return {
    eventId: 'f8ab20ef-2d5a-4d0d-a1da-2ef88a9d1e2d',
    eventType: 'OPPORTUNITY_CREATED',
    schemaVersion: 1,
    occurredAt: '2026-10-09T12:00:00.000Z',
    organizationId: 'b845ac7a-750d-4df7-9fb5-a8ef7da723dc',
    aggregateId: 'c8900e03-6e57-4ec8-9e5f-209a9f6aadac',
    producer: 'crm',
    correlationId: 'request-123',
    payload: {
      opportunityId: 'c8900e03-6e57-4ec8-9e5f-209a9f6aadac',
      customerId: '0c93c425-fbaa-4dc2-9ca5-1e14dba0aefa',
    },
  };
}

test('OpportunityCreatedEventV1 accepts minimal identifiers with optional utility unit', () => {
  const event = validEvent();
  assert.deepEqual(parseOpportunityCreatedEventV1(event), event);
  const eventWithUnit = {
    ...event,
    payload: { ...event.payload, utilityUnitId: 'b81d0d9d-7053-4696-8974-a7a59e9882b9' },
  };
  assert.deepEqual(parseOpportunityCreatedEventV1(eventWithUnit), eventWithUnit);
});

test('OpportunityCreatedEventV1 rejects unsupported event type or version', () => {
  assert.throws(
    () => parseOpportunityCreatedEventV1({ ...validEvent(), eventType: 'OPPORTUNITY_UPDATED' }),
    /eventType is unsupported/,
  );
  assert.throws(
    () => parseOpportunityCreatedEventV1({ ...validEvent(), schemaVersion: 2 }),
    /schemaVersion is unsupported/,
  );
});

test('OpportunityCreatedEventV1 rejects inconsistent, missing, or non-minimal payloads', () => {
  assert.throws(
    () =>
      parseOpportunityCreatedEventV1({
        ...validEvent(),
        payload: { ...validEvent().payload, opportunityId: 'different-opportunity' },
      }),
    /must match aggregateId/,
  );
  assert.throws(
    () =>
      parseOpportunityCreatedEventV1({
        ...validEvent(),
        payload: { opportunityId: validEvent().aggregateId },
      }),
    /customerId is required/,
  );
  assert.throws(
    () =>
      parseOpportunityCreatedEventV1({
        ...validEvent(),
        payload: { ...validEvent().payload, title: 'Commercial data' },
      }),
    /unsupported fields/,
  );
});

function validQualifiedEvent() {
  return {
    eventId: 'qualified-event-1',
    eventType: 'OPPORTUNITY_QUALIFIED',
    schemaVersion: 1,
    occurredAt: '2026-10-09T12:00:00.000Z',
    organizationId: 'organization-1',
    aggregateId: 'opportunity-1',
    producer: 'crm',
    correlationId: 'request-123',
    payload: {
      opportunityId: 'opportunity-1',
      transitionId: 'transition-1',
      customerId: 'customer-1',
      fromState: 'NOVO',
      toState: 'QUALIFICADO',
    },
  };
}

test('OpportunityQualifiedEventV1 accepts the versioned state transition', () => {
  const event = validQualifiedEvent();
  assert.deepEqual(parseOpportunityQualifiedEventV1(event), event);
});

test('OpportunityQualifiedEventV1 rejects unsupported type, version, and states', () => {
  assert.throws(
    () =>
      parseOpportunityQualifiedEventV1({ ...validQualifiedEvent(), eventType: 'OPPORTUNITY_LOST' }),
    /eventType is unsupported/,
  );
  assert.throws(
    () => parseOpportunityQualifiedEventV1({ ...validQualifiedEvent(), schemaVersion: 2 }),
    /schemaVersion is unsupported/,
  );
  assert.throws(
    () =>
      parseOpportunityQualifiedEventV1({
        ...validQualifiedEvent(),
        payload: { ...validQualifiedEvent().payload, toState: 'LOST' },
      }),
    /transition states are unsupported/,
  );
});

test('OpportunityQualifiedEventV1 rejects aggregate mismatches and extra data', () => {
  assert.throws(
    () => parseOpportunityQualifiedEventV1({ ...validQualifiedEvent(), aggregateId: 'other' }),
    /must match aggregateId/,
  );
  const withCommercialText = validQualifiedEvent();
  withCommercialText.payload.needSummary = 'Sensitive commercial text';
  assert.throws(() => parseOpportunityQualifiedEventV1(withCommercialText), /unsupported fields/);
});

test('OpportunityQualifiedEventV1 requires all transition identifiers', () => {
  for (const field of ['opportunityId', 'transitionId', 'customerId']) {
    const event = validQualifiedEvent();
    delete event.payload[field];
    assert.throws(
      () => parseOpportunityQualifiedEventV1(event),
      new RegExp(`${field} is required`),
    );
  }
});

function validLostEvent() {
  return {
    eventId: 'lost-event-1',
    eventType: 'OPPORTUNITY_LOST',
    schemaVersion: 1,
    occurredAt: '2026-10-09T12:00:00.000Z',
    organizationId: 'organization-1',
    aggregateId: 'opportunity-1',
    producer: 'crm',
    correlationId: 'request-loss-1',
    payload: {
      opportunityId: 'opportunity-1',
      transitionId: 'transition-loss-1',
      fromState: 'QUALIFICADO',
      toState: 'PERDIDO',
    },
  };
}

test('OpportunityLostEventV1 accepts the minimal loss transition without reason or notes', () => {
  const event = validLostEvent();
  assert.deepEqual(parseOpportunityLostEventV1(event), event);
});

test('OpportunityLostEventV1 rejects unsupported type, version, and destination state', () => {
  assert.throws(
    () => parseOpportunityLostEventV1({ ...validLostEvent(), eventType: 'OPPORTUNITY_CLOSED' }),
    /eventType is unsupported/,
  );
  assert.throws(
    () => parseOpportunityLostEventV1({ ...validLostEvent(), schemaVersion: 2 }),
    /schemaVersion is unsupported/,
  );
  assert.throws(
    () =>
      parseOpportunityLostEventV1({
        ...validLostEvent(),
        payload: { ...validLostEvent().payload, toState: 'QUALIFICADO' },
      }),
    /toState is unsupported/,
  );
});

test('OpportunityLostEventV1 rejects mismatched aggregate, missing IDs, and extra reason text', () => {
  assert.throws(
    () => parseOpportunityLostEventV1({ ...validLostEvent(), aggregateId: 'other' }),
    /must match aggregateId/,
  );
  const missingTransition = validLostEvent();
  delete missingTransition.payload.transitionId;
  assert.throws(() => parseOpportunityLostEventV1(missingTransition), /transitionId is required/);
  const withReason = validLostEvent();
  withReason.payload.lossReason = 'PII or commercial reason';
  assert.throws(() => parseOpportunityLostEventV1(withReason), /unsupported fields/);
});

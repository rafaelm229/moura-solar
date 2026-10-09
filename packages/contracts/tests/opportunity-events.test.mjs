import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseOpportunityCreatedEventV1 } from '../dist/index.js';

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

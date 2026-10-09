import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseActivityCreatedEventV1 } from '../dist/index.js';

function validEvent() {
  return {
    eventId: 'event-1',
    eventType: 'ACTIVITY_CREATED',
    schemaVersion: 1,
    occurredAt: '2026-10-09T12:00:00.000Z',
    organizationId: 'organization-1',
    aggregateId: 'activity-1',
    producer: 'crm',
    correlationId: 'request-1',
    payload: {
      activityId: 'activity-1',
      auditEventId: 'audit-1',
    },
  };
}

test('ActivityCreatedEventV1 accepts IDs and optional customer/opportunity links', () => {
  const event = validEvent();
  assert.deepEqual(parseActivityCreatedEventV1(event), event);
  const linkedEvent = {
    ...event,
    payload: { ...event.payload, customerId: 'customer-1', opportunityId: 'opportunity-1' },
  };
  assert.deepEqual(parseActivityCreatedEventV1(linkedEvent), linkedEvent);
});

test('ActivityCreatedEventV1 rejects unsupported type or schema version', () => {
  assert.throws(
    () => parseActivityCreatedEventV1({ ...validEvent(), eventType: 'ACTIVITY_UPDATED' }),
    /eventType is unsupported/,
  );
  assert.throws(
    () => parseActivityCreatedEventV1({ ...validEvent(), schemaVersion: 2 }),
    /schemaVersion is unsupported/,
  );
});

test('ActivityCreatedEventV1 rejects missing, inconsistent, empty, or extra payload fields', () => {
  assert.throws(
    () => parseActivityCreatedEventV1({ ...validEvent(), payload: { activityId: 'activity-1' } }),
    /auditEventId is required/,
  );
  assert.throws(
    () =>
      parseActivityCreatedEventV1({
        ...validEvent(),
        payload: { ...validEvent().payload, activityId: 'other-activity' },
      }),
    /must match aggregateId/,
  );
  assert.throws(
    () =>
      parseActivityCreatedEventV1({
        ...validEvent(),
        payload: { ...validEvent().payload, customerId: ' ' },
      }),
    /customerId must be nonempty/,
  );
  assert.throws(
    () =>
      parseActivityCreatedEventV1({
        ...validEvent(),
        payload: { ...validEvent().payload, subject: 'Dados privados' },
      }),
    /unsupported fields/,
  );
});

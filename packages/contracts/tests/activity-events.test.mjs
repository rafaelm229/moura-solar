import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  parseActivityCanceledEventV1,
  parseActivityCompletedEventV1,
  parseActivityCreatedEventV1,
  parseActivityRescheduledEventV1,
} from '../dist/index.js';

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

function validCanceledEvent() {
  return {
    ...validEvent(),
    eventType: 'ACTIVITY_CANCELED',
  };
}

test('ActivityCanceledEventV1 accepts minimal IDs and optional links', () => {
  const event = validCanceledEvent();
  assert.deepEqual(parseActivityCanceledEventV1(event), event);
  const linkedEvent = {
    ...event,
    payload: { ...event.payload, customerId: 'customer-1', opportunityId: 'opportunity-1' },
  };
  assert.deepEqual(parseActivityCanceledEventV1(linkedEvent), linkedEvent);
});

test('ActivityCanceledEventV1 rejects unsupported type/version and non-minimal payload', () => {
  assert.throws(
    () => parseActivityCanceledEventV1({ ...validCanceledEvent(), eventType: 'ACTIVITY_CREATED' }),
    /eventType is unsupported/,
  );
  assert.throws(
    () => parseActivityCanceledEventV1({ ...validCanceledEvent(), schemaVersion: 2 }),
    /schemaVersion is unsupported/,
  );
  assert.throws(
    () =>
      parseActivityCanceledEventV1({
        ...validCanceledEvent(),
        payload: { ...validCanceledEvent().payload, cancellationReason: 'private reason' },
      }),
    /unsupported fields/,
  );
});

test('ActivityCompletedEventV1 accepts IDs and an optional next activity ID', () => {
  const event = {
    ...validEvent(),
    eventType: 'ACTIVITY_COMPLETED',
  };
  assert.deepEqual(parseActivityCompletedEventV1(event), event);
  const chained = {
    ...event,
    payload: {
      ...event.payload,
      customerId: 'customer-1',
      opportunityId: 'opportunity-1',
      nextActivityId: 'next-activity-1',
    },
  };
  assert.deepEqual(parseActivityCompletedEventV1(chained), chained);
});

test('ActivityCompletedEventV1 rejects unsupported type/version and result data', () => {
  const event = { ...validEvent(), eventType: 'ACTIVITY_COMPLETED' };
  assert.throws(
    () => parseActivityCompletedEventV1({ ...event, eventType: 'ACTIVITY_CANCELED' }),
    /eventType is unsupported/,
  );
  assert.throws(
    () => parseActivityCompletedEventV1({ ...event, schemaVersion: 2 }),
    /schemaVersion is unsupported/,
  );
  assert.throws(
    () =>
      parseActivityCompletedEventV1({
        ...event,
        payload: { ...event.payload, resultNotes: 'private result' },
      }),
    /unsupported fields/,
  );
});

test('ActivityRescheduledEventV1 accepts minimal IDs and optional links', () => {
  const event = { ...validEvent(), eventType: 'ACTIVITY_RESCHEDULED' };
  assert.deepEqual(parseActivityRescheduledEventV1(event), event);
  const linked = {
    ...event,
    payload: { ...event.payload, customerId: 'customer-1', opportunityId: 'opportunity-1' },
  };
  assert.deepEqual(parseActivityRescheduledEventV1(linked), linked);
});

test('ActivityRescheduledEventV1 rejects unsupported type/version and schedule details', () => {
  const event = { ...validEvent(), eventType: 'ACTIVITY_RESCHEDULED' };
  assert.throws(
    () => parseActivityRescheduledEventV1({ ...event, eventType: 'ACTIVITY_COMPLETED' }),
    /eventType is unsupported/,
  );
  assert.throws(
    () => parseActivityRescheduledEventV1({ ...event, schemaVersion: 2 }),
    /schemaVersion is unsupported/,
  );
  assert.throws(
    () =>
      parseActivityRescheduledEventV1({
        ...event,
        payload: { ...event.payload, dueAt: '2026-10-10T12:00:00.000Z', notes: 'private' },
      }),
    /unsupported fields/,
  );
});

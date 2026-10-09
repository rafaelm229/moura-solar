import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  parseCustomerArchivedEventV1,
  parseCustomerCreatedEventV1,
  parseCustomerRestoredEventV1,
} from '../dist/index.js';

function validEvent() {
  return {
    eventId: 'f8ab20ef-2d5a-4d0d-a1da-2ef88a9d1e2d',
    eventType: 'CUSTOMER_CREATED',
    schemaVersion: 1,
    occurredAt: '2026-10-09T12:00:00.000Z',
    organizationId: 'b845ac7a-750d-4df7-9fb5-a8ef7da723dc',
    aggregateId: 'c8900e03-6e57-4ec8-9e5f-209a9f6aadac',
    producer: 'customer',
    correlationId: 'request-123',
    payload: { customerId: 'c8900e03-6e57-4ec8-9e5f-209a9f6aadac' },
  };
}

test('CustomerCreatedEventV1 accepts the minimal identifier contract', () => {
  const event = validEvent();
  assert.deepEqual(parseCustomerCreatedEventV1(event), event);
});

test('CustomerCreatedEventV1 rejects another event type or version', () => {
  assert.throws(
    () => parseCustomerCreatedEventV1({ ...validEvent(), eventType: 'CUSTOMER_UPDATED' }),
    /eventType is unsupported/,
  );
  assert.throws(
    () => parseCustomerCreatedEventV1({ ...validEvent(), schemaVersion: 2 }),
    /schemaVersion is unsupported/,
  );
});

test('CustomerCreatedEventV1 requires customerId and a valid shared envelope', () => {
  assert.throws(
    () => parseCustomerCreatedEventV1({ ...validEvent(), payload: {} }),
    /customerId is required/,
  );
  assert.throws(
    () => parseCustomerCreatedEventV1({ ...validEvent(), correlationId: '' }),
    /correlationId is required/,
  );
  assert.throws(
    () =>
      parseCustomerCreatedEventV1({
        ...validEvent(),
        payload: { ...validEvent().payload, legalName: 'Dados pessoais' },
      }),
    /unsupported fields/,
  );
  assert.throws(
    () =>
      parseCustomerCreatedEventV1({
        ...validEvent(),
        payload: { customerId: 'different-customer' },
      }),
    /must match aggregateId/,
  );
});

function validLifecycleEvent(eventType = 'CUSTOMER_ARCHIVED') {
  return {
    eventId: 'customer-lifecycle-event-1',
    eventType,
    schemaVersion: 1,
    occurredAt: '2026-10-09T12:00:00.000Z',
    organizationId: 'organization-1',
    aggregateId: 'customer-1',
    producer: 'crm',
    correlationId: 'request-customer-lifecycle',
    payload: { customerId: 'customer-1', auditEventId: 'audit-1' },
  };
}

test('Customer lifecycle events accept minimal archive and restore facts', () => {
  const archived = validLifecycleEvent();
  assert.deepEqual(parseCustomerArchivedEventV1(archived), archived);
  const restored = validLifecycleEvent('CUSTOMER_RESTORED');
  assert.deepEqual(parseCustomerRestoredEventV1(restored), restored);
});

test('Customer lifecycle events reject wrong type, version, aggregate and extra data', () => {
  assert.throws(
    () => parseCustomerArchivedEventV1(validLifecycleEvent('CUSTOMER_RESTORED')),
    /eventType is unsupported/,
  );
  assert.throws(
    () =>
      parseCustomerRestoredEventV1({
        ...validLifecycleEvent('CUSTOMER_RESTORED'),
        schemaVersion: 2,
      }),
    /schemaVersion is unsupported/,
  );
  assert.throws(
    () => parseCustomerArchivedEventV1({ ...validLifecycleEvent(), aggregateId: 'other' }),
    /must match aggregateId/,
  );
  const withPersonalData = validLifecycleEvent();
  withPersonalData.payload.email = 'private@example.test';
  assert.throws(() => parseCustomerArchivedEventV1(withPersonalData), /unsupported fields/);
});

test('Customer lifecycle events require both customer and audit identifiers', () => {
  for (const parse of [parseCustomerArchivedEventV1, parseCustomerRestoredEventV1]) {
    for (const field of ['customerId', 'auditEventId']) {
      const event = validLifecycleEvent(
        parse === parseCustomerArchivedEventV1 ? 'CUSTOMER_ARCHIVED' : 'CUSTOMER_RESTORED',
      );
      delete event.payload[field];
      assert.throws(() => parse(event), new RegExp(`${field} is required`));
    }
  }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCustomerCreatedEventV1 } from '../dist/index.js';

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

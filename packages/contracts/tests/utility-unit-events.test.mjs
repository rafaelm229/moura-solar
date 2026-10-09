import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseUtilityUnitCreatedEventV1 } from '../dist/index.js';

function validEvent() {
  return {
    eventId: 'f8ab20ef-2d5a-4d0d-a1da-2ef88a9d1e2d',
    eventType: 'UTILITY_UNIT_CREATED',
    schemaVersion: 1,
    occurredAt: '2026-10-09T12:00:00.000Z',
    organizationId: 'b845ac7a-750d-4df7-9fb5-a8ef7da723dc',
    aggregateId: 'c8900e03-6e57-4ec8-9e5f-209a9f6aadac',
    producer: 'crm',
    correlationId: 'request-123',
    payload: {
      utilityUnitId: 'c8900e03-6e57-4ec8-9e5f-209a9f6aadac',
      customerId: '0c93c425-fbaa-4dc2-9ca5-1e14dba0aefa',
    },
  };
}

test('UtilityUnitCreatedEventV1 accepts minimal identifiers with optional address ID', () => {
  const event = validEvent();
  assert.deepEqual(parseUtilityUnitCreatedEventV1(event), event);
  const eventWithAddress = {
    ...event,
    payload: { ...event.payload, addressId: 'b81d0d9d-7053-4696-8974-a7a59e9882b9' },
  };
  assert.deepEqual(parseUtilityUnitCreatedEventV1(eventWithAddress), eventWithAddress);
});

test('UtilityUnitCreatedEventV1 rejects unsupported event type or version', () => {
  assert.throws(
    () => parseUtilityUnitCreatedEventV1({ ...validEvent(), eventType: 'UTILITY_UNIT_UPDATED' }),
    /eventType is unsupported/,
  );
  assert.throws(
    () => parseUtilityUnitCreatedEventV1({ ...validEvent(), schemaVersion: 2 }),
    /schemaVersion is unsupported/,
  );
});

test('UtilityUnitCreatedEventV1 rejects inconsistent, missing, or non-minimal payloads', () => {
  assert.throws(
    () =>
      parseUtilityUnitCreatedEventV1({
        ...validEvent(),
        payload: { ...validEvent().payload, utilityUnitId: 'different-unit' },
      }),
    /must match aggregateId/,
  );
  assert.throws(
    () =>
      parseUtilityUnitCreatedEventV1({
        ...validEvent(),
        payload: { utilityUnitId: validEvent().aggregateId },
      }),
    /customerId is required/,
  );
  assert.throws(
    () =>
      parseUtilityUnitCreatedEventV1({
        ...validEvent(),
        payload: { ...validEvent().payload, externalCode: 'ACCOUNT-123' },
      }),
    /unsupported fields/,
  );
});

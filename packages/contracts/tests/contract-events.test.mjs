import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseContractCanceledEventV1, parseContractDeliveredEventV1 } from '../dist/index.js';

const delivered = {
  eventId: 'event-delivered',
  eventType: 'CONTRACT_DELIVERED',
  schemaVersion: 1,
  occurredAt: '2026-10-09T12:00:00.000Z',
  organizationId: 'org-1',
  aggregateId: 'contract-1',
  producer: 'contracts',
  correlationId: 'request-1',
  payload: {
    contractId: 'contract-1',
    deliveryId: 'delivery-1',
    auditEventId: 'audit-1',
    opportunityId: 'opportunity-1',
  },
};

test('CONTRACT_DELIVERED v1 accepts IDs from the manual delivery record', () => {
  assert.deepEqual(parseContractDeliveredEventV1(delivered), delivered);
});

test('CONTRACT_DELIVERED v1 rejects unsupported types, versions, mismatches and details', () => {
  assert.throws(() => parseContractDeliveredEventV1({ ...delivered, eventType: 'CONTRACT_SENT' }));
  assert.throws(() => parseContractDeliveredEventV1({ ...delivered, schemaVersion: 2 }));
  assert.throws(() =>
    parseContractDeliveredEventV1({
      ...delivered,
      payload: { ...delivered.payload, contractId: 'other' },
    }),
  );
  assert.throws(() =>
    parseContractDeliveredEventV1({
      ...delivered,
      payload: { ...delivered.payload, recipient: 'client@example.test' },
    }),
  );
});

const canceled = {
  ...delivered,
  eventType: 'CONTRACT_CANCELED',
  payload: {
    contractId: 'contract-1',
    auditEventId: 'audit-canceled-1',
    opportunityId: 'opportunity-1',
  },
};

test('CONTRACT_CANCELED v1 accepts only identifiers from the cancellation audit', () => {
  assert.deepEqual(parseContractCanceledEventV1(canceled), canceled);
});

test('CONTRACT_CANCELED v1 rejects unsupported types, versions, mismatches and details', () => {
  assert.throws(() =>
    parseContractCanceledEventV1({ ...canceled, eventType: 'CONTRACT_TERMINATED' }),
  );
  assert.throws(() => parseContractCanceledEventV1({ ...canceled, schemaVersion: 2 }));
  assert.throws(() =>
    parseContractCanceledEventV1({
      ...canceled,
      payload: { ...canceled.payload, contractId: 'other' },
    }),
  );
  assert.throws(() =>
    parseContractCanceledEventV1({
      ...canceled,
      payload: { ...canceled.payload, reason: 'motivo confidencial' },
    }),
  );
});

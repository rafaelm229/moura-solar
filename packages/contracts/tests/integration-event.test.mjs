import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseIntegrationEvent } from '../dist/index.js';

const envelope = {
  eventId: 'event-1',
  eventType: 'customer.created',
  schemaVersion: 1,
  occurredAt: '2026-10-08T12:30:00.000Z',
  organizationId: 'organization-1',
  aggregateId: 'customer-1',
  aggregateVersion: 2,
  producer: 'commercial',
  correlationId: 'request-1',
  causationId: 'command-1',
  payload: { customerId: 'customer-1' },
};

describe('integration event envelope', () => {
  it('accepts a versioned envelope without changing its payload', () => {
    assert.equal(parseIntegrationEvent(envelope), envelope);
  });

  it('requires every textual envelope field to be present and nonempty', () => {
    for (const field of [
      'eventId',
      'eventType',
      'occurredAt',
      'organizationId',
      'aggregateId',
      'producer',
      'correlationId',
    ]) {
      const missing = { ...envelope };
      delete missing[field];
      assert.throws(() => parseIntegrationEvent(missing), new RegExp(field));
      assert.throws(() => parseIntegrationEvent({ ...envelope, [field]: '  ' }), new RegExp(field));
    }
  });

  it('rejects absent correlation, invalid versions and timestamps', () => {
    assert.throws(() => parseIntegrationEvent({ ...envelope, correlationId: '' }), /correlationId/);
    assert.throws(() => parseIntegrationEvent({ ...envelope, schemaVersion: 0 }), /schemaVersion/);
    assert.throws(
      () => parseIntegrationEvent({ ...envelope, aggregateVersion: -1 }),
      /aggregateVersion/,
    );
    assert.throws(
      () => parseIntegrationEvent({ ...envelope, occurredAt: 'yesterday' }),
      /occurredAt/,
    );
  });

  it('rejects a payload that is not an object', () => {
    assert.throws(() => parseIntegrationEvent({ ...envelope, payload: [] }), /payload/);
  });
});

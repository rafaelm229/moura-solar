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

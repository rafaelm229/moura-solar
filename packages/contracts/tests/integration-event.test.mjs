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

  it('rejects empty correlation, invalid versions and timestamps', () => {
    assert.throws(() => parseIntegrationEvent({ ...envelope, correlationId: '' }), /correlationId/);
    for (const schemaVersion of [0, 1.5, Number.MAX_SAFE_INTEGER + 1, '1', null]) {
      assert.throws(() => parseIntegrationEvent({ ...envelope, schemaVersion }), /schemaVersion/);
    }
    assert.throws(
      () => parseIntegrationEvent({ ...envelope, occurredAt: 'yesterday' }),
      /occurredAt/,
    );
  });

  it('validates optional metadata only when supplied', () => {
    const minimal = { ...envelope };
    delete minimal.aggregateVersion;
    delete minimal.causationId;
    assert.equal(parseIntegrationEvent(minimal), minimal);

    for (const aggregateVersion of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '2', null]) {
      assert.throws(
        () => parseIntegrationEvent({ ...envelope, aggregateVersion }),
        /aggregateVersion/,
      );
    }

    for (const causationId of ['', '  ', 42, null]) {
      assert.throws(() => parseIntegrationEvent({ ...envelope, causationId }), /causationId/);
    }
  });

  it('rejects values that are not event objects', () => {
    for (const value of [undefined, null, [], 'event', 42]) {
      assert.throws(() => parseIntegrationEvent(value), /must be an object/);
    }
  });

  it('rejects a payload that is not an object', () => {
    for (const payload of [undefined, null, [], 'payload', 42, false]) {
      assert.throws(() => parseIntegrationEvent({ ...envelope, payload }), /payload/);
    }
  });
});

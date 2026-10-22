import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCatalogItemCreatedEventV1, parseCatalogItemUpdatedEventV1 } from '../dist/index.js';

const created = {
  eventId: 'event-created',
  eventType: 'CATALOG_ITEM_CREATED',
  schemaVersion: 1,
  occurredAt: '2026-10-09T12:00:00.000Z',
  organizationId: 'org-1',
  aggregateId: 'catalog-1',
  producer: 'catalog',
  correlationId: 'request-1',
  payload: { catalogItemId: 'catalog-1', auditEventId: 'audit-1', version: 1 },
};

test('CATALOG_ITEM_CREATED v1 validates minimal IDs and version', () => {
  assert.deepEqual(parseCatalogItemCreatedEventV1(created), created);
});

test('CATALOG_ITEM_UPDATED v1 validates minimal IDs and incremented version', () => {
  const updated = {
    ...created,
    eventId: 'event-updated',
    eventType: 'CATALOG_ITEM_UPDATED',
    payload: { catalogItemId: 'catalog-1', auditEventId: 'audit-2', version: 2 },
  };
  assert.deepEqual(parseCatalogItemUpdatedEventV1(updated), updated);
});

test('catalog event parsers reject unsupported types, versions, mismatches and data fields', () => {
  assert.throws(() =>
    parseCatalogItemCreatedEventV1({ ...created, eventType: 'CATALOG_ITEM_UPDATED' }),
  );
  assert.throws(() => parseCatalogItemCreatedEventV1({ ...created, schemaVersion: 2 }));
  assert.throws(() => parseCatalogItemCreatedEventV1({ ...created, aggregateId: 'other' }));
  assert.throws(() =>
    parseCatalogItemUpdatedEventV1({
      ...created,
      eventType: 'CATALOG_ITEM_UPDATED',
      payload: { ...created.payload, catalogItemId: 'other' },
    }),
  );
  assert.throws(() =>
    parseCatalogItemCreatedEventV1({
      ...created,
      payload: { ...created.payload, referencePrice: 999 },
    }),
  );
});

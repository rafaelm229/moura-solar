import { parseIntegrationEvent, type IntegrationEvent } from './integration-event.js';

type CatalogItemPayload = {
  catalogItemId: string;
  auditEventId: string;
  version: number;
};

export type CatalogItemCreatedEventV1 = IntegrationEvent<CatalogItemPayload> & {
  eventType: 'CATALOG_ITEM_CREATED';
  schemaVersion: 1;
};

export type CatalogItemUpdatedEventV1 = IntegrationEvent<CatalogItemPayload> & {
  eventType: 'CATALOG_ITEM_UPDATED';
  schemaVersion: 1;
};

function parseCatalogItemEventV1(
  value: unknown,
  eventType: 'CATALOG_ITEM_CREATED' | 'CATALOG_ITEM_UPDATED',
): CatalogItemCreatedEventV1 | CatalogItemUpdatedEventV1 {
  const event = parseIntegrationEvent(value);

  if (event.eventType !== eventType) {
    throw new TypeError('Catalog event eventType is unsupported');
  }
  if (event.schemaVersion !== 1) {
    throw new TypeError('Catalog event schemaVersion is unsupported');
  }
  const payload = event.payload;
  for (const field of ['catalogItemId', 'auditEventId'] as const) {
    if (typeof payload[field] !== 'string' || !payload[field].trim()) {
      throw new TypeError(`Catalog event payload ${field} is required`);
    }
  }
  if (
    typeof payload.version !== 'number' ||
    !Number.isSafeInteger(payload.version) ||
    payload.version < 1
  ) {
    throw new TypeError('Catalog event payload version must be a positive integer');
  }
  if (payload.catalogItemId !== event.aggregateId) {
    throw new TypeError('Catalog event payload catalogItemId must match aggregateId');
  }
  if (
    Object.keys(payload).some(
      (field) => !['catalogItemId', 'auditEventId', 'version'].includes(field),
    )
  ) {
    throw new TypeError('Catalog event payload contains unsupported fields');
  }

  return event as CatalogItemCreatedEventV1 | CatalogItemUpdatedEventV1;
}

/** Validates a minimal catalog-created fact without catalog values or projections. */
export function parseCatalogItemCreatedEventV1(value: unknown): CatalogItemCreatedEventV1 {
  return parseCatalogItemEventV1(value, 'CATALOG_ITEM_CREATED') as CatalogItemCreatedEventV1;
}

/** Validates a minimal catalog-updated fact without catalog values or projections. */
export function parseCatalogItemUpdatedEventV1(value: unknown): CatalogItemUpdatedEventV1 {
  return parseCatalogItemEventV1(value, 'CATALOG_ITEM_UPDATED') as CatalogItemUpdatedEventV1;
}

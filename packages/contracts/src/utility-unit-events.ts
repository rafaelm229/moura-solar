import { parseIntegrationEvent, type IntegrationEvent } from './integration-event.js';

export type UtilityUnitCreatedEventV1 = IntegrationEvent<{
  utilityUnitId: string;
  customerId: string;
  addressId?: string;
}> & {
  eventType: 'UTILITY_UNIT_CREATED';
  schemaVersion: 1;
};

export type UtilityUnitUpdatedEventV1 = IntegrationEvent<{
  utilityUnitId: string;
  customerId: string;
  auditEventId: string;
}> & {
  eventType: 'UTILITY_UNIT_UPDATED';
  schemaVersion: 1;
};

function hasIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Validates the minimal utility-unit contract without account or address details. */
export function parseUtilityUnitCreatedEventV1(value: unknown): UtilityUnitCreatedEventV1 {
  const event = parseIntegrationEvent(value);

  if (event.eventType !== 'UTILITY_UNIT_CREATED') {
    throw new TypeError('Utility unit event eventType is unsupported');
  }
  if (event.schemaVersion !== 1) {
    throw new TypeError('Utility unit event schemaVersion is unsupported');
  }
  if (!hasIdentifier(event.payload.utilityUnitId)) {
    throw new TypeError('Utility unit event payload utilityUnitId is required');
  }
  if (event.payload.utilityUnitId !== event.aggregateId) {
    throw new TypeError('Utility unit event payload utilityUnitId must match aggregateId');
  }
  if (!hasIdentifier(event.payload.customerId)) {
    throw new TypeError('Utility unit event payload customerId is required');
  }
  if (event.payload.addressId !== undefined && !hasIdentifier(event.payload.addressId)) {
    throw new TypeError('Utility unit event payload addressId must be nonempty');
  }
  if (
    Object.keys(event.payload).some(
      (field) => !['utilityUnitId', 'customerId', 'addressId'].includes(field),
    )
  ) {
    throw new TypeError('Utility unit event payload contains unsupported fields');
  }

  return event as UtilityUnitCreatedEventV1;
}

/** Validates a minimal utility-unit update without account or tariff details. */
export function parseUtilityUnitUpdatedEventV1(value: unknown): UtilityUnitUpdatedEventV1 {
  const event = parseIntegrationEvent(value);

  if (event.eventType !== 'UTILITY_UNIT_UPDATED') {
    throw new TypeError('Utility unit event eventType is unsupported');
  }
  if (event.schemaVersion !== 1) {
    throw new TypeError('Utility unit event schemaVersion is unsupported');
  }
  for (const field of ['utilityUnitId', 'customerId', 'auditEventId'] as const) {
    if (!hasIdentifier(event.payload[field])) {
      throw new TypeError(`Utility unit event payload ${field} is required`);
    }
  }
  if (event.payload.utilityUnitId !== event.aggregateId) {
    throw new TypeError('Utility unit event payload utilityUnitId must match aggregateId');
  }
  if (
    Object.keys(event.payload).some(
      (field) => !['utilityUnitId', 'customerId', 'auditEventId'].includes(field),
    )
  ) {
    throw new TypeError('Utility unit event payload contains unsupported fields');
  }

  return event as UtilityUnitUpdatedEventV1;
}

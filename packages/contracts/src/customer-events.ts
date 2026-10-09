import { parseIntegrationEvent, type IntegrationEvent } from './integration-event.js';

export type CustomerCreatedEventV1 = IntegrationEvent<{ customerId: string }> & {
  eventType: 'CUSTOMER_CREATED';
  schemaVersion: 1;
};

export type CustomerArchivedEventV1 = IntegrationEvent<{
  customerId: string;
  auditEventId: string;
}> & {
  eventType: 'CUSTOMER_ARCHIVED';
  schemaVersion: 1;
};

export type CustomerRestoredEventV1 = IntegrationEvent<{
  customerId: string;
  auditEventId: string;
}> & {
  eventType: 'CUSTOMER_RESTORED';
  schemaVersion: 1;
};

/** Validates the minimal customer-created contract without exposing customer details. */
export function parseCustomerCreatedEventV1(value: unknown): CustomerCreatedEventV1 {
  const event = parseIntegrationEvent(value);

  if (event.eventType !== 'CUSTOMER_CREATED') {
    throw new TypeError('Customer event eventType is unsupported');
  }
  if (event.schemaVersion !== 1) {
    throw new TypeError('Customer event schemaVersion is unsupported');
  }
  if (typeof event.payload.customerId !== 'string' || !event.payload.customerId.trim()) {
    throw new TypeError('Customer event payload customerId is required');
  }
  if (event.payload.customerId !== event.aggregateId) {
    throw new TypeError('Customer event payload customerId must match aggregateId');
  }
  if (Object.keys(event.payload).some((field) => field !== 'customerId')) {
    throw new TypeError('Customer event payload contains unsupported fields');
  }

  return event as CustomerCreatedEventV1;
}

function parseCustomerLifecycleEventV1(
  value: unknown,
  eventType: 'CUSTOMER_ARCHIVED' | 'CUSTOMER_RESTORED',
): CustomerArchivedEventV1 | CustomerRestoredEventV1 {
  const event = parseIntegrationEvent(value);

  if (event.eventType !== eventType) {
    throw new TypeError('Customer event eventType is unsupported');
  }
  if (event.schemaVersion !== 1) {
    throw new TypeError('Customer event schemaVersion is unsupported');
  }
  for (const field of ['customerId', 'auditEventId'] as const) {
    if (typeof event.payload[field] !== 'string' || !event.payload[field].trim()) {
      throw new TypeError(`Customer event payload ${field} is required`);
    }
  }
  if (event.payload.customerId !== event.aggregateId) {
    throw new TypeError('Customer event payload customerId must match aggregateId');
  }
  if (Object.keys(event.payload).some((field) => !['customerId', 'auditEventId'].includes(field))) {
    throw new TypeError('Customer event payload contains unsupported fields');
  }

  return event as CustomerArchivedEventV1 | CustomerRestoredEventV1;
}

/** Validates customer archive fact without customer or contact data. */
export function parseCustomerArchivedEventV1(value: unknown): CustomerArchivedEventV1 {
  return parseCustomerLifecycleEventV1(value, 'CUSTOMER_ARCHIVED') as CustomerArchivedEventV1;
}

/** Validates customer restoration fact without customer or contact data. */
export function parseCustomerRestoredEventV1(value: unknown): CustomerRestoredEventV1 {
  return parseCustomerLifecycleEventV1(value, 'CUSTOMER_RESTORED') as CustomerRestoredEventV1;
}

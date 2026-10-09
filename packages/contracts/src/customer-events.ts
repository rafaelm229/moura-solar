import { parseIntegrationEvent, type IntegrationEvent } from './integration-event.js';

export type CustomerCreatedEventV1 = IntegrationEvent<{ customerId: string }> & {
  eventType: 'CUSTOMER_CREATED';
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

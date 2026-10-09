import { parseIntegrationEvent, type IntegrationEvent } from './integration-event.js';

export type ActivityCreatedEventV1 = IntegrationEvent<{
  activityId: string;
  auditEventId: string;
  customerId?: string;
  opportunityId?: string;
}> & {
  eventType: 'ACTIVITY_CREATED';
  schemaVersion: 1;
};

export type ActivityCanceledEventV1 = IntegrationEvent<{
  activityId: string;
  auditEventId: string;
  customerId?: string;
  opportunityId?: string;
}> & {
  eventType: 'ACTIVITY_CANCELED';
  schemaVersion: 1;
};

export type ActivityCompletedEventV1 = IntegrationEvent<{
  activityId: string;
  auditEventId: string;
  customerId?: string;
  opportunityId?: string;
  nextActivityId?: string;
}> & {
  eventType: 'ACTIVITY_COMPLETED';
  schemaVersion: 1;
};

export type ActivityRescheduledEventV1 = IntegrationEvent<{
  activityId: string;
  auditEventId: string;
  customerId?: string;
  opportunityId?: string;
}> & {
  eventType: 'ACTIVITY_RESCHEDULED';
  schemaVersion: 1;
};

function hasIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Validates activity creation without subject, description, assignee, or schedule. */
export function parseActivityCreatedEventV1(value: unknown): ActivityCreatedEventV1 {
  const event = parseIntegrationEvent(value);

  if (event.eventType !== 'ACTIVITY_CREATED') {
    throw new TypeError('Activity event eventType is unsupported');
  }
  if (event.schemaVersion !== 1) {
    throw new TypeError('Activity event schemaVersion is unsupported');
  }
  for (const field of ['activityId', 'auditEventId'] as const) {
    if (!hasIdentifier(event.payload[field])) {
      throw new TypeError(`Activity event payload ${field} is required`);
    }
  }
  if (event.payload.activityId !== event.aggregateId) {
    throw new TypeError('Activity event payload activityId must match aggregateId');
  }
  for (const field of ['customerId', 'opportunityId'] as const) {
    if (event.payload[field] !== undefined && !hasIdentifier(event.payload[field])) {
      throw new TypeError(`Activity event payload ${field} must be nonempty`);
    }
  }
  if (
    Object.keys(event.payload).some(
      (field) => !['activityId', 'auditEventId', 'customerId', 'opportunityId'].includes(field),
    )
  ) {
    throw new TypeError('Activity event payload contains unsupported fields');
  }

  return event as ActivityCreatedEventV1;
}

/** Validates activity cancellation without reason or other activity details. */
export function parseActivityCanceledEventV1(value: unknown): ActivityCanceledEventV1 {
  const event = parseIntegrationEvent(value);

  if (event.eventType !== 'ACTIVITY_CANCELED') {
    throw new TypeError('Activity event eventType is unsupported');
  }
  if (event.schemaVersion !== 1) {
    throw new TypeError('Activity event schemaVersion is unsupported');
  }
  for (const field of ['activityId', 'auditEventId'] as const) {
    if (!hasIdentifier(event.payload[field])) {
      throw new TypeError(`Activity event payload ${field} is required`);
    }
  }
  if (event.payload.activityId !== event.aggregateId) {
    throw new TypeError('Activity event payload activityId must match aggregateId');
  }
  for (const field of ['customerId', 'opportunityId'] as const) {
    if (event.payload[field] !== undefined && !hasIdentifier(event.payload[field])) {
      throw new TypeError(`Activity event payload ${field} must be nonempty`);
    }
  }
  if (
    Object.keys(event.payload).some(
      (field) => !['activityId', 'auditEventId', 'customerId', 'opportunityId'].includes(field),
    )
  ) {
    throw new TypeError('Activity event payload contains unsupported fields');
  }

  return event as ActivityCanceledEventV1;
}

/** Validates activity completion without result code, notes, or activity text. */
export function parseActivityCompletedEventV1(value: unknown): ActivityCompletedEventV1 {
  const event = parseIntegrationEvent(value);

  if (event.eventType !== 'ACTIVITY_COMPLETED') {
    throw new TypeError('Activity event eventType is unsupported');
  }
  if (event.schemaVersion !== 1) {
    throw new TypeError('Activity event schemaVersion is unsupported');
  }
  for (const field of ['activityId', 'auditEventId'] as const) {
    if (!hasIdentifier(event.payload[field])) {
      throw new TypeError(`Activity event payload ${field} is required`);
    }
  }
  if (event.payload.activityId !== event.aggregateId) {
    throw new TypeError('Activity event payload activityId must match aggregateId');
  }
  for (const field of ['customerId', 'opportunityId', 'nextActivityId'] as const) {
    if (event.payload[field] !== undefined && !hasIdentifier(event.payload[field])) {
      throw new TypeError(`Activity event payload ${field} must be nonempty`);
    }
  }
  if (
    Object.keys(event.payload).some(
      (field) =>
        !['activityId', 'auditEventId', 'customerId', 'opportunityId', 'nextActivityId'].includes(
          field,
        ),
    )
  ) {
    throw new TypeError('Activity event payload contains unsupported fields');
  }

  return event as ActivityCompletedEventV1;
}

/** Validates activity rescheduling without due date, notes, or activity text. */
export function parseActivityRescheduledEventV1(value: unknown): ActivityRescheduledEventV1 {
  const event = parseIntegrationEvent(value);

  if (event.eventType !== 'ACTIVITY_RESCHEDULED') {
    throw new TypeError('Activity event eventType is unsupported');
  }
  if (event.schemaVersion !== 1) {
    throw new TypeError('Activity event schemaVersion is unsupported');
  }
  for (const field of ['activityId', 'auditEventId'] as const) {
    if (!hasIdentifier(event.payload[field])) {
      throw new TypeError(`Activity event payload ${field} is required`);
    }
  }
  if (event.payload.activityId !== event.aggregateId) {
    throw new TypeError('Activity event payload activityId must match aggregateId');
  }
  for (const field of ['customerId', 'opportunityId'] as const) {
    if (event.payload[field] !== undefined && !hasIdentifier(event.payload[field])) {
      throw new TypeError(`Activity event payload ${field} must be nonempty`);
    }
  }
  if (
    Object.keys(event.payload).some(
      (field) => !['activityId', 'auditEventId', 'customerId', 'opportunityId'].includes(field),
    )
  ) {
    throw new TypeError('Activity event payload contains unsupported fields');
  }

  return event as ActivityRescheduledEventV1;
}

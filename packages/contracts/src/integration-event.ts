/** Shared wire envelope for future integration events (SPEC-019). */
export interface IntegrationEvent<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> {
  eventId: string;
  eventType: string;
  schemaVersion: number;
  occurredAt: string;
  organizationId: string;
  aggregateId: string;
  aggregateVersion?: number;
  producer: string;
  correlationId: string;
  causationId?: string;
  payload: TPayload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/** Checks the shared envelope only. Consumers must validate eventType, version and payload. */
export function parseIntegrationEvent(value: unknown): IntegrationEvent {
  if (!isRecord(value)) throw new TypeError('Integration event must be an object');

  for (const field of [
    'eventId',
    'eventType',
    'organizationId',
    'aggregateId',
    'producer',
    'correlationId',
  ] as const) {
    if (!hasText(value[field])) throw new TypeError(`Integration event ${field} is required`);
  }
  if (!isPositiveInteger(value.schemaVersion)) {
    throw new TypeError('Integration event schemaVersion must be a positive integer');
  }
  if (value.aggregateVersion !== undefined && !isPositiveInteger(value.aggregateVersion)) {
    throw new TypeError('Integration event aggregateVersion must be a positive integer');
  }
  if (value.causationId !== undefined && !hasText(value.causationId)) {
    throw new TypeError('Integration event causationId must be nonempty');
  }
  if (
    !hasText(value.occurredAt) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value.occurredAt,
    ) ||
    Number.isNaN(Date.parse(value.occurredAt))
  ) {
    throw new TypeError('Integration event occurredAt must be an ISO 8601 timestamp');
  }
  if (!isRecord(value.payload)) {
    throw new TypeError('Integration event payload must be an object');
  }

  return value as unknown as IntegrationEvent;
}

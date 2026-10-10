import { parseIntegrationEvent, type IntegrationEvent } from './integration-event.js';

export type ContractDeliveredEventV1 = IntegrationEvent<{
  contractId: string;
  deliveryId: string;
  auditEventId: string;
  opportunityId: string;
}> & {
  eventType: 'CONTRACT_DELIVERED';
  schemaVersion: 1;
};

export type ContractCanceledEventV1 = IntegrationEvent<{
  contractId: string;
  auditEventId: string;
  opportunityId: string;
}> & {
  eventType: 'CONTRACT_CANCELED';
  schemaVersion: 1;
};

export type ContractAmendmentRecordedEventV1 = IntegrationEvent<{
  contractId: string;
  auditEventId: string;
  opportunityId: string;
}> & {
  eventType: 'CONTRACT_AMENDMENT_RECORDED';
  schemaVersion: 1;
};

export type ContractSignedReviewedEventV1 = IntegrationEvent<{
  contractId: string;
  reviewId: string;
  auditEventId: string;
  opportunityId: string;
  decision: 'VERIFIED' | 'REJECTED';
}> & {
  eventType: 'CONTRACT_SIGNED_REVIEWED';
  schemaVersion: 1;
};

/** Validates a manually recorded contract delivery without channel or recipient data. */
export function parseContractDeliveredEventV1(value: unknown): ContractDeliveredEventV1 {
  const event = parseIntegrationEvent(value);

  if (event.eventType !== 'CONTRACT_DELIVERED') {
    throw new TypeError('Contract event eventType is unsupported');
  }
  if (event.schemaVersion !== 1) {
    throw new TypeError('Contract event schemaVersion is unsupported');
  }
  for (const field of ['contractId', 'deliveryId', 'auditEventId', 'opportunityId'] as const) {
    if (typeof event.payload[field] !== 'string' || !event.payload[field].trim()) {
      throw new TypeError(`Contract event payload ${field} is required`);
    }
  }
  if (event.payload.contractId !== event.aggregateId) {
    throw new TypeError('Contract event payload contractId must match aggregateId');
  }
  if (
    Object.keys(event.payload).some(
      (field) => !['contractId', 'deliveryId', 'auditEventId', 'opportunityId'].includes(field),
    )
  ) {
    throw new TypeError('Contract event payload contains unsupported fields');
  }

  return event as ContractDeliveredEventV1;
}

/** Validates a minimal contract-cancellation fact without reason or contract details. */
export function parseContractCanceledEventV1(value: unknown): ContractCanceledEventV1 {
  const event = parseIntegrationEvent(value);

  if (event.eventType !== 'CONTRACT_CANCELED') {
    throw new TypeError('Contract event eventType is unsupported');
  }
  if (event.schemaVersion !== 1) {
    throw new TypeError('Contract event schemaVersion is unsupported');
  }
  for (const field of ['contractId', 'auditEventId', 'opportunityId'] as const) {
    if (typeof event.payload[field] !== 'string' || !event.payload[field].trim()) {
      throw new TypeError(`Contract event payload ${field} is required`);
    }
  }
  if (event.payload.contractId !== event.aggregateId) {
    throw new TypeError('Contract event payload contractId must match aggregateId');
  }
  if (
    Object.keys(event.payload).some(
      (field) => !['contractId', 'auditEventId', 'opportunityId'].includes(field),
    )
  ) {
    throw new TypeError('Contract event payload contains unsupported fields');
  }

  return event as ContractCanceledEventV1;
}

/** Validates a minimal manual contract-amendment record without amendment details. */
export function parseContractAmendmentRecordedEventV1(
  value: unknown,
): ContractAmendmentRecordedEventV1 {
  const event = parseIntegrationEvent(value);

  if (event.eventType !== 'CONTRACT_AMENDMENT_RECORDED') {
    throw new TypeError('Contract event eventType is unsupported');
  }
  if (event.schemaVersion !== 1) {
    throw new TypeError('Contract event schemaVersion is unsupported');
  }
  for (const field of ['contractId', 'auditEventId', 'opportunityId'] as const) {
    if (typeof event.payload[field] !== 'string' || !event.payload[field].trim()) {
      throw new TypeError(`Contract event payload ${field} is required`);
    }
  }
  if (event.payload.contractId !== event.aggregateId) {
    throw new TypeError('Contract event payload contractId must match aggregateId');
  }
  if (
    Object.keys(event.payload).some(
      (field) => !['contractId', 'auditEventId', 'opportunityId'].includes(field),
    )
  ) {
    throw new TypeError('Contract event payload contains unsupported fields');
  }

  return event as ContractAmendmentRecordedEventV1;
}

/** Validates the human decision for a signed contract without checklist or rejection details. */
export function parseContractSignedReviewedEventV1(value: unknown): ContractSignedReviewedEventV1 {
  const event = parseIntegrationEvent(value);

  if (event.eventType !== 'CONTRACT_SIGNED_REVIEWED') {
    throw new TypeError('Contract event eventType is unsupported');
  }
  if (event.schemaVersion !== 1) {
    throw new TypeError('Contract event schemaVersion is unsupported');
  }
  for (const field of ['contractId', 'reviewId', 'auditEventId', 'opportunityId'] as const) {
    if (typeof event.payload[field] !== 'string' || !event.payload[field].trim()) {
      throw new TypeError(`Contract event payload ${field} is required`);
    }
  }
  if (event.payload.contractId !== event.aggregateId) {
    throw new TypeError('Contract event payload contractId must match aggregateId');
  }
  if (
    typeof event.payload.decision !== 'string' ||
    !['VERIFIED', 'REJECTED'].includes(event.payload.decision)
  ) {
    throw new TypeError('Contract event payload decision is unsupported');
  }
  if (
    Object.keys(event.payload).some(
      (field) =>
        !['contractId', 'reviewId', 'auditEventId', 'opportunityId', 'decision'].includes(field),
    )
  ) {
    throw new TypeError('Contract event payload contains unsupported fields');
  }

  return event as ContractSignedReviewedEventV1;
}

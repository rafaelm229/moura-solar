import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parseProposalAcceptedEventV1,
  parseProposalCreatedEventV1,
  parseProposalDeliveredEventV1,
  parseProposalRejectedEventV1,
  parseProposalVersionCreatedEventV1,
} from '../dist/index.js';

const validCreatedEvent = () => ({
  eventId: 'event-1',
  eventType: 'PROPOSAL_CREATED',
  schemaVersion: 1,
  occurredAt: '2026-10-09T12:00:00.000Z',
  organizationId: 'organization-1',
  aggregateId: 'proposal-1',
  producer: 'proposal',
  correlationId: 'request-1',
  payload: {
    proposalId: 'proposal-1',
    proposalVersionId: 'proposal-version-1',
    opportunityId: 'opportunity-1',
  },
});

describe('proposal created event v1 contract', () => {
  it('accepts minimal proposal, version and opportunity identifiers', () => {
    const event = validCreatedEvent();
    assert.equal(parseProposalCreatedEventV1(event), event);
  });

  it('rejects unsupported types, versions, aggregate mismatches, and extra fields', () => {
    assert.throws(
      () => parseProposalCreatedEventV1({ ...validCreatedEvent(), eventType: 'PROPOSAL_UPDATED' }),
      /eventType is unsupported/,
    );
    assert.throws(
      () => parseProposalCreatedEventV1({ ...validCreatedEvent(), schemaVersion: 2 }),
      /schemaVersion is unsupported/,
    );
    assert.throws(
      () => parseProposalCreatedEventV1({ ...validCreatedEvent(), aggregateId: 'other' }),
      /must match aggregateId/,
    );
    const withExtra = validCreatedEvent();
    withExtra.payload.price = 100;
    assert.throws(() => parseProposalCreatedEventV1(withExtra), /unsupported fields/);
  });

  it('rejects missing and empty identifiers', () => {
    const event = validCreatedEvent();
    delete event.payload.proposalVersionId;
    assert.throws(() => parseProposalCreatedEventV1(event), /proposalVersionId is required/);
    assert.throws(
      () =>
        parseProposalCreatedEventV1({
          ...validCreatedEvent(),
          payload: { ...validCreatedEvent().payload, opportunityId: ' ' },
        }),
      /opportunityId is required/,
    );
  });
});

const validDeliveredEvent = () => ({
  eventId: 'event-2',
  eventType: 'PROPOSAL_DELIVERED',
  schemaVersion: 1,
  occurredAt: '2026-10-09T12:00:00.000Z',
  organizationId: 'organization-1',
  aggregateId: 'proposal-1',
  producer: 'proposal',
  correlationId: 'request-2',
  payload: {
    proposalId: 'proposal-1',
    proposalVersionId: 'proposal-version-1',
    deliveryId: 'delivery-1',
    opportunityId: 'opportunity-1',
  },
});

describe('proposal delivered event v1 contract', () => {
  it('accepts minimal delivery identifiers without channel or recipient data', () => {
    const event = validDeliveredEvent();
    assert.equal(parseProposalDeliveredEventV1(event), event);
  });

  it('rejects unsupported type, version, aggregate mismatch, and extra fields', () => {
    assert.throws(
      () => parseProposalDeliveredEventV1({ ...validDeliveredEvent(), eventType: 'PROPOSAL_SENT' }),
      /eventType is unsupported/,
    );
    assert.throws(
      () => parseProposalDeliveredEventV1({ ...validDeliveredEvent(), schemaVersion: 2 }),
      /schemaVersion is unsupported/,
    );
    assert.throws(
      () => parseProposalDeliveredEventV1({ ...validDeliveredEvent(), aggregateId: 'other' }),
      /must match aggregateId/,
    );
    const withRecipient = validDeliveredEvent();
    withRecipient.payload.recipient = 'client@example.test';
    assert.throws(() => parseProposalDeliveredEventV1(withRecipient), /unsupported fields/);
  });

  it('rejects missing and empty identifiers', () => {
    const event = validDeliveredEvent();
    delete event.payload.deliveryId;
    assert.throws(() => parseProposalDeliveredEventV1(event), /deliveryId is required/);
    assert.throws(
      () =>
        parseProposalDeliveredEventV1({
          ...validDeliveredEvent(),
          payload: { ...validDeliveredEvent().payload, opportunityId: ' ' },
        }),
      /opportunityId is required/,
    );
  });
});

const validVersionCreatedEvent = () => ({
  eventId: 'event-3',
  eventType: 'PROPOSAL_VERSION_CREATED',
  schemaVersion: 1,
  occurredAt: '2026-10-09T12:00:00.000Z',
  organizationId: 'organization-1',
  aggregateId: 'proposal-1',
  producer: 'proposal',
  correlationId: 'request-3',
  payload: {
    proposalId: 'proposal-1',
    proposalVersionId: 'proposal-version-2',
    basedOnVersionId: 'proposal-version-1',
    opportunityId: 'opportunity-1',
  },
});

describe('proposal version created event v1 contract', () => {
  it('accepts minimal version lineage identifiers', () => {
    const event = validVersionCreatedEvent();
    assert.equal(parseProposalVersionCreatedEventV1(event), event);
  });

  it('rejects unsupported type, version, aggregate mismatch, and extra fields', () => {
    assert.throws(
      () =>
        parseProposalVersionCreatedEventV1({
          ...validVersionCreatedEvent(),
          eventType: 'PROPOSAL_UPDATED',
        }),
      /eventType is unsupported/,
    );
    assert.throws(
      () => parseProposalVersionCreatedEventV1({ ...validVersionCreatedEvent(), schemaVersion: 2 }),
      /schemaVersion is unsupported/,
    );
    assert.throws(
      () =>
        parseProposalVersionCreatedEventV1({ ...validVersionCreatedEvent(), aggregateId: 'other' }),
      /must match aggregateId/,
    );
    const withPrice = validVersionCreatedEvent();
    withPrice.payload.price = 100;
    assert.throws(() => parseProposalVersionCreatedEventV1(withPrice), /unsupported fields/);
  });

  it('rejects missing, empty, and identical version identifiers', () => {
    const event = validVersionCreatedEvent();
    delete event.payload.basedOnVersionId;
    assert.throws(() => parseProposalVersionCreatedEventV1(event), /basedOnVersionId is required/);
    assert.throws(
      () =>
        parseProposalVersionCreatedEventV1({
          ...validVersionCreatedEvent(),
          payload: { ...validVersionCreatedEvent().payload, proposalVersionId: ' ' },
        }),
      /proposalVersionId is required/,
    );
    assert.throws(
      () =>
        parseProposalVersionCreatedEventV1({
          ...validVersionCreatedEvent(),
          payload: {
            ...validVersionCreatedEvent().payload,
            basedOnVersionId: 'proposal-version-2',
          },
        }),
      /versions must be distinct/,
    );
  });
});

const validEvent = () => ({
  eventId: 'event-1',
  eventType: 'PROPOSAL_ACCEPTED',
  schemaVersion: 1,
  occurredAt: '2026-10-09T12:00:00.000Z',
  organizationId: 'organization-1',
  aggregateId: 'proposal-1',
  producer: 'proposal',
  correlationId: 'request-1',
  payload: {
    acceptanceId: 'acceptance-1',
    proposalVersionId: 'proposal-version-1',
    opportunityId: 'opportunity-1',
  },
});

describe('proposal accepted event v1 contract', () => {
  it('accepts a valid event without transforming it', () => {
    const event = validEvent();

    assert.equal(parseProposalAcceptedEventV1(event), event);
  });

  it('rejects unsupported event types and versions', () => {
    assert.throws(
      () => parseProposalAcceptedEventV1({ ...validEvent(), eventType: 'PROPOSAL_REJECTED' }),
      /eventType is unsupported/,
    );
    assert.throws(
      () => parseProposalAcceptedEventV1({ ...validEvent(), schemaVersion: 2 }),
      /schemaVersion is unsupported/,
    );
  });

  it('rejects missing identifiers in the event payload', () => {
    for (const field of ['acceptanceId', 'proposalVersionId', 'opportunityId']) {
      const event = validEvent();
      delete event.payload[field];

      assert.throws(() => parseProposalAcceptedEventV1(event), new RegExp(`${field} is required`));
    }
  });

  it('rejects empty payload identifiers and malformed envelopes', () => {
    assert.throws(
      () =>
        parseProposalAcceptedEventV1({
          ...validEvent(),
          payload: { ...validEvent().payload, acceptanceId: ' ' },
        }),
      /acceptanceId is required/,
    );
    assert.throws(() => parseProposalAcceptedEventV1(null), /must be an object/);
  });
});

const validRejectedEvent = () => ({
  eventId: 'event-rejected-1',
  eventType: 'PROPOSAL_REJECTED',
  schemaVersion: 1,
  occurredAt: '2026-10-09T12:00:00.000Z',
  organizationId: 'organization-1',
  aggregateId: 'proposal-1',
  producer: 'proposal',
  correlationId: 'request-rejection-1',
  payload: {
    rejectionId: 'rejection-1',
    proposalId: 'proposal-1',
    proposalVersionId: 'proposal-version-1',
    opportunityId: 'opportunity-1',
  },
});

describe('proposal rejected event v1 contract', () => {
  it('accepts a minimal rejection fact without reason or notes', () => {
    const event = validRejectedEvent();
    assert.equal(parseProposalRejectedEventV1(event), event);
  });

  it('rejects unsupported type, version, aggregate mismatch and extra text', () => {
    assert.throws(
      () => parseProposalRejectedEventV1({ ...validRejectedEvent(), eventType: 'PROPOSAL_SENT' }),
      /eventType is unsupported/,
    );
    assert.throws(
      () => parseProposalRejectedEventV1({ ...validRejectedEvent(), schemaVersion: 2 }),
      /schemaVersion is unsupported/,
    );
    assert.throws(
      () => parseProposalRejectedEventV1({ ...validRejectedEvent(), aggregateId: 'other' }),
      /must match aggregateId/,
    );
    const withReason = validRejectedEvent();
    withReason.payload.reason = 'Sensitive customer explanation';
    assert.throws(() => parseProposalRejectedEventV1(withReason), /unsupported fields/);
  });

  it('rejects missing and empty identifiers', () => {
    for (const field of ['rejectionId', 'proposalId', 'proposalVersionId', 'opportunityId']) {
      const event = validRejectedEvent();
      delete event.payload[field];
      assert.throws(() => parseProposalRejectedEventV1(event), new RegExp(`${field} is required`));
    }
    assert.throws(
      () =>
        parseProposalRejectedEventV1({
          ...validRejectedEvent(),
          payload: { ...validRejectedEvent().payload, proposalVersionId: ' ' },
        }),
      /proposalVersionId is required/,
    );
  });
});

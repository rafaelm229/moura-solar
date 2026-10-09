import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseProposalAcceptedEventV1 } from '../dist/index.js';

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

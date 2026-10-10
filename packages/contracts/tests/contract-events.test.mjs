import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseContractAmendmentRecordedEventV1,
  parseContractCanceledEventV1,
  parseContractDeliveredEventV1,
  parseContractSignedReviewedEventV1,
} from '../dist/index.js';

const delivered = {
  eventId: 'event-delivered',
  eventType: 'CONTRACT_DELIVERED',
  schemaVersion: 1,
  occurredAt: '2026-10-09T12:00:00.000Z',
  organizationId: 'org-1',
  aggregateId: 'contract-1',
  producer: 'contracts',
  correlationId: 'request-1',
  payload: {
    contractId: 'contract-1',
    deliveryId: 'delivery-1',
    auditEventId: 'audit-1',
    opportunityId: 'opportunity-1',
  },
};

test('CONTRACT_DELIVERED v1 accepts IDs from the manual delivery record', () => {
  assert.deepEqual(parseContractDeliveredEventV1(delivered), delivered);
});

test('CONTRACT_DELIVERED v1 rejects unsupported types, versions, mismatches and details', () => {
  assert.throws(() => parseContractDeliveredEventV1({ ...delivered, eventType: 'CONTRACT_SENT' }));
  assert.throws(() => parseContractDeliveredEventV1({ ...delivered, schemaVersion: 2 }));
  assert.throws(() =>
    parseContractDeliveredEventV1({
      ...delivered,
      payload: { ...delivered.payload, contractId: 'other' },
    }),
  );
  assert.throws(() =>
    parseContractDeliveredEventV1({
      ...delivered,
      payload: { ...delivered.payload, recipient: 'client@example.test' },
    }),
  );
});

const canceled = {
  ...delivered,
  eventType: 'CONTRACT_CANCELED',
  payload: {
    contractId: 'contract-1',
    auditEventId: 'audit-canceled-1',
    opportunityId: 'opportunity-1',
  },
};

test('CONTRACT_CANCELED v1 accepts only identifiers from the cancellation audit', () => {
  assert.deepEqual(parseContractCanceledEventV1(canceled), canceled);
});

test('CONTRACT_CANCELED v1 rejects unsupported types, versions, mismatches and details', () => {
  assert.throws(() =>
    parseContractCanceledEventV1({ ...canceled, eventType: 'CONTRACT_TERMINATED' }),
  );
  assert.throws(() => parseContractCanceledEventV1({ ...canceled, schemaVersion: 2 }));
  assert.throws(() =>
    parseContractCanceledEventV1({
      ...canceled,
      payload: { ...canceled.payload, contractId: 'other' },
    }),
  );
  assert.throws(() =>
    parseContractCanceledEventV1({
      ...canceled,
      payload: { ...canceled.payload, reason: 'motivo confidencial' },
    }),
  );
});

const amendmentRecorded = {
  ...delivered,
  eventType: 'CONTRACT_AMENDMENT_RECORDED',
  payload: {
    contractId: 'contract-1',
    auditEventId: 'audit-amendment-1',
    opportunityId: 'opportunity-1',
  },
};

test('CONTRACT_AMENDMENT_RECORDED v1 accepts only identifiers from the audit', () => {
  assert.deepEqual(parseContractAmendmentRecordedEventV1(amendmentRecorded), amendmentRecorded);
});

test('CONTRACT_AMENDMENT_RECORDED v1 rejects unsupported types, versions, mismatches and details', () => {
  assert.throws(() =>
    parseContractAmendmentRecordedEventV1({ ...amendmentRecorded, eventType: 'CONTRACT_AMENDED' }),
  );
  assert.throws(() =>
    parseContractAmendmentRecordedEventV1({ ...amendmentRecorded, schemaVersion: 2 }),
  );
  assert.throws(() =>
    parseContractAmendmentRecordedEventV1({
      ...amendmentRecorded,
      payload: { ...amendmentRecorded.payload, contractId: 'other' },
    }),
  );
  assert.throws(() =>
    parseContractAmendmentRecordedEventV1({
      ...amendmentRecorded,
      payload: { ...amendmentRecorded.payload, reason: 'termo confidencial' },
    }),
  );
});

const signedReviewed = {
  ...delivered,
  eventType: 'CONTRACT_SIGNED_REVIEWED',
  payload: {
    contractId: 'contract-1',
    reviewId: 'review-1',
    auditEventId: 'audit-review-1',
    opportunityId: 'opportunity-1',
    decision: 'VERIFIED',
  },
};

test('CONTRACT_SIGNED_REVIEWED v1 accepts a minimal human decision', () => {
  assert.deepEqual(parseContractSignedReviewedEventV1(signedReviewed), signedReviewed);
  assert.equal(
    parseContractSignedReviewedEventV1({
      ...signedReviewed,
      payload: { ...signedReviewed.payload, decision: 'REJECTED' },
    }).payload.decision,
    'REJECTED',
  );
});

test('CONTRACT_SIGNED_REVIEWED v1 rejects unsupported decisions and review details', () => {
  assert.throws(() =>
    parseContractSignedReviewedEventV1({ ...signedReviewed, eventType: 'CONTRACT_VERIFIED' }),
  );
  assert.throws(() => parseContractSignedReviewedEventV1({ ...signedReviewed, schemaVersion: 2 }));
  assert.throws(() =>
    parseContractSignedReviewedEventV1({
      ...signedReviewed,
      payload: { ...signedReviewed.payload, decision: 'PENDING' },
    }),
  );
  assert.throws(() =>
    parseContractSignedReviewedEventV1({
      ...signedReviewed,
      payload: { ...signedReviewed.payload, rejectionReason: 'informação confidencial' },
    }),
  );
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseEnergyBillImportEventV1 } from '../dist/index.js';

describe('energy bill import event v1 contracts', () => {
  it('accepts the queued contract without changing the payload', () => {
    const event = {
      eventType: 'ENERGY_BILL_IMPORT_QUEUED',
      schemaVersion: 1,
      payload: { importId: 'import-1', documentVersionId: 'document-version-1' },
    };

    assert.equal(parseEnergyBillImportEventV1(event), event);
  });

  it('accepts the applied contract without changing the payload', () => {
    const event = {
      eventType: 'ENERGY_BILL_IMPORT_APPLIED',
      schemaVersion: 1,
      payload: { importId: 'import-1', reviewId: 'review-1' },
    };

    assert.equal(parseEnergyBillImportEventV1(event), event);
  });

  it('rejects malformed objects, unknown types and unknown or legacy versions', () => {
    assert.throws(() => parseEnergyBillImportEventV1(null), /must be an object/);
    assert.throws(
      () =>
        parseEnergyBillImportEventV1({
          eventType: 'PROJECT_CREATED',
          schemaVersion: 1,
          payload: {},
        }),
      /eventType is unsupported/,
    );
    for (const schemaVersion of [null, 2]) {
      assert.throws(
        () =>
          parseEnergyBillImportEventV1({
            eventType: 'ENERGY_BILL_IMPORT_QUEUED',
            schemaVersion,
            payload: { importId: 'import-1', documentVersionId: 'document-version-1' },
          }),
        /schemaVersion is unsupported/,
      );
    }
  });

  it('rejects missing identifiers and non-object payloads', () => {
    assert.throws(
      () =>
        parseEnergyBillImportEventV1({
          eventType: 'ENERGY_BILL_IMPORT_QUEUED',
          schemaVersion: 1,
          payload: { importId: 'import-1' },
        }),
      /documentVersionId is required/,
    );
    assert.throws(
      () =>
        parseEnergyBillImportEventV1({
          eventType: 'ENERGY_BILL_IMPORT_APPLIED',
          schemaVersion: 1,
          payload: { importId: ' ', reviewId: 'review-1' },
        }),
      /importId is required/,
    );
    assert.throws(
      () =>
        parseEnergyBillImportEventV1({
          eventType: 'ENERGY_BILL_IMPORT_QUEUED',
          schemaVersion: 1,
          payload: [],
        }),
      /payload must be an object/,
    );
  });

  it('rejects fields outside the minimal manual-import contract', () => {
    assert.throws(
      () =>
        parseEnergyBillImportEventV1({
          eventType: 'ENERGY_BILL_IMPORT_QUEUED',
          schemaVersion: 1,
          payload: {
            importId: 'import-1',
            documentVersionId: 'document-version-1',
            customerName: 'Should not be propagated',
          },
        }),
      /payload contains unsupported fields/,
    );
    assert.throws(
      () =>
        parseEnergyBillImportEventV1({
          eventType: 'ENERGY_BILL_IMPORT_APPLIED',
          schemaVersion: 1,
          payload: { importId: 'import-1', reviewId: 'review-1' },
          accountNumber: 'Should not be propagated',
        }),
      /event contains unsupported fields/,
    );
  });
});

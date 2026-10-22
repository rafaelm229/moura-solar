export type EnergyBillImportQueuedEventV1 = {
  eventType: 'ENERGY_BILL_IMPORT_QUEUED';
  schemaVersion: 1;
  payload: {
    importId: string;
    documentVersionId: string;
  };
};

export type EnergyBillImportAppliedEventV1 = {
  eventType: 'ENERGY_BILL_IMPORT_APPLIED';
  schemaVersion: 1;
  payload: {
    importId: string;
    reviewId: string;
  };
};

export type EnergyBillImportEventV1 =
  EnergyBillImportQueuedEventV1 | EnergyBillImportAppliedEventV1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Validates only the known v1 import payloads; this does not publish or consume events. */
export function parseEnergyBillImportEventV1(value: unknown): EnergyBillImportEventV1 {
  if (!isRecord(value)) throw new TypeError('Energy bill import event must be an object');
  if (
    Object.keys(value).some((field) => !['eventType', 'schemaVersion', 'payload'].includes(field))
  ) {
    throw new TypeError('Energy bill import event contains unsupported fields');
  }
  if (
    value.eventType !== 'ENERGY_BILL_IMPORT_QUEUED' &&
    value.eventType !== 'ENERGY_BILL_IMPORT_APPLIED'
  ) {
    throw new TypeError('Energy bill import event eventType is unsupported');
  }
  if (value.schemaVersion !== 1) {
    throw new TypeError('Energy bill import event schemaVersion is unsupported');
  }
  if (!isRecord(value.payload)) {
    throw new TypeError('Energy bill import event payload must be an object');
  }

  const requiredIdentifiers =
    value.eventType === 'ENERGY_BILL_IMPORT_QUEUED'
      ? ['importId', 'documentVersionId']
      : ['importId', 'reviewId'];
  if (Object.keys(value.payload).some((field) => !requiredIdentifiers.includes(field))) {
    throw new TypeError('Energy bill import event payload contains unsupported fields');
  }
  for (const field of requiredIdentifiers) {
    if (!hasIdentifier(value.payload[field])) {
      throw new TypeError(`Energy bill import event payload ${field} is required`);
    }
  }

  return value as unknown as EnergyBillImportEventV1;
}

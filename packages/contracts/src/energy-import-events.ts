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

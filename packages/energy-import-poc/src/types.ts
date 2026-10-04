export const fieldNames = [
  'utilityUnit.externalCode',
  'utilityUnit.distributorName',
  'utilityUnit.holderName',
  'utilityUnit.holderDocument',
  'utilityUnit.address',
  'utilityUnit.consumerClass',
  'utilityUnit.consumerSubclass',
  'utilityUnit.supplyType',
  'utilityUnit.voltage',
  'bill.referenceMonth',
  'bill.consumptionKwh',
  'bill.injectedKwh',
  'bill.billedEnergyKwh',
  'bill.billedAmount',
  'bill.tariffComponents',
  'history.referenceMonth',
  'history.consumptionKwh',
  'history.injectedKwh',
] as const;

export type FieldName = (typeof fieldNames)[number];
export type DocumentFormat = 'DIGITAL_PDF' | 'SCANNED_PDF' | 'PHOTO';
export type DocumentQuality = 'GOOD' | 'POOR' | 'ROTATED';
export type Outcome = 'SUCCEEDED' | 'FAILED' | 'FALLBACK_MANUAL';

export interface CorpusDocument {
  sampleId: string;
  distributor: string;
  format: DocumentFormat;
  quality: DocumentQuality;
  pageCount: number;
  labels: Array<{ key: string; field: FieldName; value: string; unit?: string; page: number }>;
}

export interface CorpusManifest {
  schemaVersion: '1';
  corpusId: string;
  purpose: 'ENERGY_BILL_EXTRACTION_POC';
  authorization: {
    approved: boolean;
    approvedAt: string;
    approvedByRole: string;
    privacyReviewed: boolean;
  };
  blindEvaluation: boolean;
  documents: CorpusDocument[];
}

export interface Candidate {
  key: string;
  field: FieldName;
  value: string;
  unit?: string;
  page: number;
  providerConfidence?: { value: number; scale: string };
}

export interface ExtractionRun {
  sampleId: string;
  outcome: Outcome;
  latencyMs: number;
  chargedPages: number;
  cost: { amount: string; currency: string };
  candidates: Candidate[];
  errorCode?: string;
}

export interface AdapterRunSet {
  schemaVersion: '1';
  adapter: {
    name: string;
    model: string;
    version: string;
    region: string;
    languageMode: string;
    executedAt: string;
  };
  runs: ExtractionRun[];
}

export interface QualityGoal {
  field: FieldName;
  minExactRate: number;
  minCoverage: number;
}

export interface ExperimentPolicy {
  schemaVersion: '1';
  approvedBudget: { amount: string; currency: string };
  goals: QualityGoal[];
  criticalFields: FieldName[];
}

export interface SliceMetrics {
  expected: number;
  predicted: number;
  exact: number;
  corrections: number;
  missing: number;
  unexpected: number;
  exactRate: number | null;
  coverage: number | null;
}

export interface BenchmarkReport {
  schemaVersion: '1';
  corpusId: string;
  adapter: AdapterRunSet['adapter'];
  totals: {
    documents: number;
    succeeded: number;
    fallbackManual: number;
    failed: number;
    latencyP50Ms: number | null;
    latencyP95Ms: number | null;
    chargedPages: number;
    cost: { amount: string; currency: string };
    costPerSucceededDocument: string | null;
    criticalErrors: number;
    fallbackManualRate: number;
  };
  byField: Record<string, SliceMetrics>;
  byDistributor: Record<string, SliceMetrics>;
  byFormat: Record<string, SliceMetrics>;
  byQuality: Record<string, SliceMetrics>;
  gates: Array<{ name: string; passed: boolean; actual: string; target: string }>;
  recommendation: 'CONTINUE' | 'STOP' | 'INCONCLUSIVE';
}

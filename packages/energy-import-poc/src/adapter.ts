import type { Candidate } from './types.js';

export interface PocDocumentInput {
  sampleId: string;
  content: Uint8Array;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
  pageCount: number;
}

export interface SubmitReceipt {
  operationId: string;
  submittedAt: string;
}

export type PollResult<TRaw> =
  | { state: 'PENDING' }
  | { state: 'SUCCEEDED'; raw: TRaw; chargedPages: number; providerLatencyMs: number }
  | { state: 'FAILED'; errorCode: string; retryable: boolean };

/**
 * Experimental provider boundary. Implementations receive bytes selected by the
 * harness, never an extractor-controlled URL, and cannot mutate application data.
 */
export interface ExtractionPocAdapter<TRaw> {
  readonly identity: {
    name: string;
    model: string;
    version: string;
    region: string;
    languageMode: string;
  };
  submit(input: PocDocumentInput, correlationId: string): Promise<SubmitReceipt>;
  poll(operationId: string): Promise<PollResult<TRaw>>;
  cancel(operationId: string): Promise<void>;
  normalize(raw: TRaw): Candidate[];
}

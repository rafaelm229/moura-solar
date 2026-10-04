import { createHash } from 'node:crypto';
import type { ExtractionPocAdapter, PollResult, ProviderUsage } from './adapter.js';
import { microsToMoney, moneyToMicros } from './money.js';
import type { Candidate } from './types.js';

const apiVersion = '2024-11-30';
const modelPattern = /^[a-zA-Z0-9][a-zA-Z0-9._~-]{1,63}$/;
const operationPattern = /^[a-f0-9-]{36}$/i;

export interface AzureResult {
  status?: string;
  analyzeResult?: { pages?: unknown[]; [key: string]: unknown };
  error?: { code?: string };
}

export interface AzureDocumentIntelligenceConfig {
  endpoint: string;
  apiKey: string;
  modelId: string;
  region: string;
  languageMode: string;
  estimatedCostPerPage: string;
  currency: string;
  normalize: (result: AzureResult) => Candidate[];
  http?: typeof fetch;
  now?: () => Date;
}

function correlationUuid(value: string): string {
  const digest = createHash('sha256').update(value).digest('hex');
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}

async function json(response: Response): Promise<AzureResult> {
  const text = await response.text();
  if (text.length > 20 * 1024 * 1024) throw new Error('PROVIDER_RESPONSE_TOO_LARGE');
  try {
    return JSON.parse(text) as AzureResult;
  } catch {
    throw new Error('PROVIDER_RESPONSE_INVALID');
  }
}

export class AzureDocumentIntelligenceAdapter implements ExtractionPocAdapter<AzureResult> {
  readonly identity;
  private readonly endpoint: URL;
  private readonly http: typeof fetch;
  private readonly now: () => Date;

  constructor(private readonly config: AzureDocumentIntelligenceConfig) {
    this.endpoint = new URL(config.endpoint);
    if (
      this.endpoint.protocol !== 'https:' ||
      !this.endpoint.hostname.endsWith('.cognitiveservices.azure.com') ||
      (this.endpoint.pathname !== '/' && this.endpoint.pathname !== '') ||
      this.endpoint.search ||
      this.endpoint.hash
    )
      throw new Error('Azure endpoint is not allowed');
    if (!modelPattern.test(config.modelId)) throw new Error('Azure modelId is invalid');
    if (!config.apiKey) throw new Error('Azure API key is required');
    if (!/^[A-Z]{3}$/.test(config.currency)) throw new Error('Azure currency is invalid');
    moneyToMicros(config.estimatedCostPerPage);
    this.http = config.http ?? fetch;
    this.now = config.now ?? (() => new Date());
    this.identity = {
      name: 'azure-document-intelligence',
      model: config.modelId,
      version: apiVersion,
      region: config.region,
      languageMode: config.languageMode,
    };
  }

  private resultUrl(operationId: string): URL {
    if (!operationPattern.test(operationId)) throw new Error('AZURE_OPERATION_ID_INVALID');
    return new URL(
      `/documentintelligence/documentModels/${encodeURIComponent(this.config.modelId)}/analyzeResults/${operationId}?api-version=${apiVersion}`,
      this.endpoint,
    );
  }

  private usage(pages: number): ProviderUsage {
    return {
      chargedPages: pages,
      cost: {
        amount: microsToMoney(moneyToMicros(this.config.estimatedCostPerPage) * BigInt(pages)),
        currency: this.config.currency,
      },
    };
  }

  estimateUsage(input: { pageCount: number }): ProviderUsage {
    return this.usage(input.pageCount);
  }

  async submit(
    input: Parameters<ExtractionPocAdapter<AzureResult>['submit']>[0],
    correlationId: string,
  ) {
    const url = new URL(
      `/documentintelligence/documentModels/${encodeURIComponent(this.config.modelId)}:analyze`,
      this.endpoint,
    );
    url.searchParams.set('_overload', 'analyzeDocument');
    url.searchParams.set('api-version', apiVersion);
    const response = await this.http(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'ocp-apim-subscription-key': this.config.apiKey,
        'x-ms-client-request-id': correlationUuid(correlationId),
      },
      body: JSON.stringify({ base64Source: Buffer.from(input.content).toString('base64') }),
    });
    if (response.status !== 202) throw new Error(`AZURE_SUBMIT_${response.status}`);
    const location = response.headers.get('operation-location');
    if (!location) throw new Error('AZURE_OPERATION_LOCATION_MISSING');
    const operation = new URL(location);
    const expectedPrefix = `/documentintelligence/documentModels/${this.config.modelId}/analyzeResults/`;
    if (
      operation.origin !== this.endpoint.origin ||
      !operation.pathname.startsWith(expectedPrefix) ||
      operation.searchParams.get('api-version') !== apiVersion
    )
      throw new Error('AZURE_OPERATION_LOCATION_INVALID');
    const operationId = operation.pathname.slice(expectedPrefix.length);
    if (!operationPattern.test(operationId)) throw new Error('AZURE_OPERATION_LOCATION_INVALID');
    return { operationId, submittedAt: this.now().toISOString() };
  }

  async poll(operationId: string): Promise<PollResult<AzureResult>> {
    const response = await this.http(this.resultUrl(operationId), {
      headers: { 'ocp-apim-subscription-key': this.config.apiKey },
    });
    if (!response.ok) throw new Error(`AZURE_POLL_${response.status}`);
    const result = await json(response);
    const status = result.status?.toLowerCase();
    if (status === 'notstarted' || status === 'running') return { state: 'PENDING' };
    const pages = Array.isArray(result.analyzeResult?.pages)
      ? result.analyzeResult.pages.length
      : 0;
    if (status === 'succeeded')
      return { state: 'SUCCEEDED', raw: result, usage: this.usage(pages) };
    if (status === 'failed' || status === 'canceled')
      return {
        state: 'FAILED',
        errorCode: result.error?.code ?? `AZURE_${status.toUpperCase()}`,
        retryable: false,
        usage: this.usage(pages),
      };
    throw new Error('AZURE_STATUS_INVALID');
  }

  async cancel(operationId: string): Promise<void> {
    const response = await this.http(this.resultUrl(operationId), {
      method: 'DELETE',
      headers: { 'ocp-apim-subscription-key': this.config.apiKey },
    });
    if (![200, 204, 404].includes(response.status))
      throw new Error(`AZURE_CANCEL_${response.status}`);
  }

  normalize(raw: AzureResult): Candidate[] {
    return this.config.normalize(raw);
  }
}

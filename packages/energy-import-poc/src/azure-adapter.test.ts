import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AzureDocumentIntelligenceAdapter } from './azure-adapter.js';
import type { Candidate } from './types.js';

const endpoint = 'https://fixture.cognitiveservices.azure.com';
const operationId = '3b31320d-8bab-4f88-b19c-2322a7f11034';
const candidate: Candidate = {
  key: 'bill.consumptionKwh',
  field: 'bill.consumptionKwh',
  value: '421.50',
  unit: 'kWh',
  page: 1,
};

describe('Azure Document Intelligence PoC adapter', () => {
  it('sends only base64 bytes to the fixed Azure host and polls the returned operation', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const responses = [
      new Response(null, {
        status: 202,
        headers: {
          'operation-location': `${endpoint}/documentintelligence/documentModels/model-1/analyzeResults/${operationId}?api-version=2024-11-30`,
        },
      }),
      new Response(
        JSON.stringify({ status: 'succeeded', analyzeResult: { pages: [{ pageNumber: 1 }] } }),
        { status: 200 },
      ),
      new Response(null, { status: 204 }),
    ];
    const adapter = new AzureDocumentIntelligenceAdapter({
      endpoint,
      apiKey: 'test-only-key',
      modelId: 'model-1',
      region: 'brazilsouth',
      languageMode: 'pt-BR',
      estimatedCostPerPage: '0.030000',
      currency: 'USD',
      normalize: () => [candidate],
      now: () => new Date('2026-10-04T12:00:00Z'),
      http: async (input, init) => {
        requests.push({ url: String(input), ...(init ? { init } : {}) });
        return responses.shift()!;
      },
    });
    const receipt = await adapter.submit(
      {
        sampleId: 'sample_001',
        content: Buffer.from('fixture'),
        mimeType: 'application/pdf',
        pageCount: 1,
      },
      'correlation-without-personal-data',
    );
    assert.deepEqual(adapter.estimateUsage({ pageCount: 2 }), {
      chargedPages: 2,
      cost: { amount: '0.060000', currency: 'USD' },
    });
    assert.equal(receipt.operationId, operationId);
    const submitted = JSON.parse(String(requests[0]?.init?.body)) as Record<string, unknown>;
    assert.deepEqual(Object.keys(submitted), ['base64Source']);
    assert.equal(submitted.base64Source, Buffer.from('fixture').toString('base64'));
    assert.equal(new URL(requests[0]!.url).hostname, 'fixture.cognitiveservices.azure.com');
    const result = await adapter.poll(receipt.operationId);
    assert.equal(result.state, 'SUCCEEDED');
    if (result.state === 'SUCCEEDED') {
      assert.equal(result.usage.chargedPages, 1);
      assert.equal(result.usage.cost.amount, '0.030000');
      assert.deepEqual(adapter.normalize(result.raw), [candidate]);
    }
    await adapter.cancel(receipt.operationId);
    assert.equal(requests[2]?.init?.method, 'DELETE');
  });

  it('rejects arbitrary endpoints and operation redirects', async () => {
    assert.throws(
      () =>
        new AzureDocumentIntelligenceAdapter({
          endpoint: 'https://attacker.example',
          apiKey: 'key',
          modelId: 'model-1',
          region: 'test',
          languageMode: 'pt-BR',
          estimatedCostPerPage: '0.01',
          currency: 'USD',
          normalize: () => [],
        }),
      /endpoint is not allowed/,
    );
    const adapter = new AzureDocumentIntelligenceAdapter({
      endpoint,
      apiKey: 'key',
      modelId: 'model-1',
      region: 'test',
      languageMode: 'pt-BR',
      estimatedCostPerPage: '0.01',
      currency: 'USD',
      normalize: () => [],
      http: async () =>
        new Response(null, {
          status: 202,
          headers: {
            'operation-location': `https://attacker.example/analyzeResults/${operationId}?api-version=2024-11-30`,
          },
        }),
    });
    await assert.rejects(
      () =>
        adapter.submit(
          {
            sampleId: 'sample_001',
            content: Buffer.from('fixture'),
            mimeType: 'application/pdf',
            pageCount: 1,
          },
          'correlation',
        ),
      /location is not allowed|LOCATION_INVALID/i,
    );
  });
});

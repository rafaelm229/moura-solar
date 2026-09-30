import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, result } from './client';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
afterEach(() => vi.unstubAllGlobals());
describe('session transport', () => {
  it('coordinates simultaneous expired requests into a single refresh', async () => {
    let renewed = false;
    let refreshes = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.endsWith('/refresh')) {
          refreshes++;
          await new Promise((resolve) => setTimeout(resolve, 5));
          renewed = true;
          return json({});
        }
        return renewed ? json([]) : json({ message: 'Expired' }, 401);
      }),
    );
    await Promise.all([
      result(api.GET('/api/v1/identity/sessions')),
      result(api.GET('/api/v1/identity/audit')),
    ]);
    expect(refreshes).toBe(1);
  });
  it('does not refresh or erase authentication on unavailable API or denied permission', async () => {
    for (const status of [503, 403]) {
      const fetcher = vi.fn(async () => json({ message: 'Try again' }, status));
      vi.stubGlobal('fetch', fetcher);
      await expect(result(api.GET('/api/v1/identity/sessions'))).rejects.toMatchObject({ status });
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  });
  it('stops after one rejected refresh', async () => {
    const fetcher = vi.fn(async () => json({ message: 'Session revoked' }, 401));
    vi.stubGlobal('fetch', fetcher);
    await expect(result(api.GET('/api/v1/identity/sessions'))).rejects.toMatchObject({
      status: 401,
    });
    expect(fetcher).toHaveBeenCalledTimes(3); // original request, context under lock, one refresh
  });
});

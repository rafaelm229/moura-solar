import createClient from 'openapi-fetch';
import type { paths, components } from './schema';
export type Schemas = components['schemas'];
export const createApiClient = (transport: typeof fetch = fetch) =>
  createClient<paths>({
    baseUrl: typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin,
    fetch: transport,
    credentials: 'include',
  });

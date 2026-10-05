import { createApiClient, type Schemas } from '@moura-solar/api-client';
export type Context = Schemas['ContextDto'];
export type Member = Schemas['MemberViewDto'];
export type Role = Schemas['RoleViewDto'];
export type Team = Schemas['TeamViewDto'];
export type Session = Schemas['SessionViewDto'];
export type Audit = Schemas['AuditViewDto'];
export type Grant = Schemas['GrantDto'];
export class ApiFailure extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}
let refreshing: Promise<boolean> | null = null;
async function renew() {
  const execute = async () => {
    // Another tab may have already rotated the shared cookie while this tab waited.
    const context = await fetch('/api/v1/identity/me', {
      credentials: 'include',
      cache: 'no-store',
    });
    if (context.ok) return true;
    if (context.status !== 401)
      throw new ApiFailure('API indisponível. Tente novamente.', context.status);
    const response = await fetch('/api/v1/identity/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'x-requested-with': 'MouraSolar' },
    });
    if (!response.ok && response.status !== 401)
      throw new ApiFailure('Não foi possível renovar agora. Tente novamente.', response.status);
    return response.ok;
  };
  return typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('moura-session-refresh', execute)
    : execute();
}
const transport: typeof fetch = async (input, init) => {
  const request = new Request(input, init);
  request.headers.set('x-requested-with', 'MouraSolar');
  const backup = request.clone();
  let response = await fetch(request);
  const path = new URL(request.url).pathname;
  if (
    response.status === 401 &&
    !['/login', '/refresh', '/accept-link'].some((suffix) => path.endsWith(suffix))
  ) {
    refreshing ??= renew().finally(() => {
      refreshing = null;
    });
    if (await refreshing) response = await fetch(backup);
  }
  return response;
};
// OpenAPI paths are relative; Request in the generated client requires an absolute base.
export const api = createApiClient(async (input, init) => {
  try {
    return await transport(input, init);
  } catch (error) {
    if (error instanceof ApiFailure) throw error;
    throw new ApiFailure('Falha de conexão. Seus dados preenchidos foram preservados.', 0);
  }
});
export async function result<T>(
  call: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const response = await call;
  if (!response.response.ok) {
    const error = response.error as
      { message?: string; code?: string; details?: Record<string, unknown> } | undefined;
    throw new ApiFailure(
      error?.message ?? 'Não foi possível concluir a ação.',
      response.response.status,
      error?.code,
      error?.details,
    );
  }
  return response.data as T;
}
export const commandHeaders = () => ({ 'idempotency-key': crypto.randomUUID() });
export function allows(context: Context, permission: string, organization = false) {
  return context.grants.some(
    (grant) => grant.permission === permission && (!organization || grant.scope === 'organization'),
  );
}

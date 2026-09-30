'use client';
import { ApiFailure } from './client';
export function Feedback({ error, success }: { error?: Error | null; success?: string }) {
  if (error)
    return (
      <p className="notice error" role="alert">
        {error instanceof ApiFailure && error.status === 403
          ? 'Sem permissão para esta ação. Seu acesso pode ter mudado.'
          : error.message}
      </p>
    );
  if (success)
    return (
      <p className="notice" role="status">
        {success}
      </p>
    );
  return null;
}

'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result } from './client';
import { Feedback } from './feedback';
export function Sessions({ onLogout }: { onLogout: () => void }) {
  const client = useQueryClient();
  const sessions = useQuery({
    queryKey: ['sessions'],
    queryFn: () => result(api.GET('/api/v1/identity/sessions')),
  });
  const revoke = useMutation({
    mutationFn: (id: string) =>
      result(api.POST('/api/v1/identity/sessions/{id}/revoke', { params: { path: { id } } })),
    onSuccess: (data) => {
      if (sessions.data?.some((session) => session.id === data.id && session.current)) onLogout();
      else void client.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
  return (
    <section>
      <h2>Minhas sessões</h2>
      <p>Encerrar um aparelho não encerra os demais.</p>
      <Feedback
        error={sessions.error ?? revoke.error}
        success={revoke.isSuccess ? 'Sessão encerrada.' : undefined}
      />
      {sessions.isPending && <p role="status">Carregando sessões…</p>}
      <div className="record-list">
        {sessions.data?.map((session) => (
          <article className="panel" key={session.id}>
            <h3>{session.current ? 'Este aparelho' : 'Outro aparelho'}</h3>
            <p className="device">{session.device}</p>
            <p>Entrada em {new Date(session.createdAt).toLocaleString('pt-BR')}</p>
            <button
              disabled={revoke.isPending}
              onClick={() => {
                if (
                  confirm('Encerrar esta sessão? Será necessário entrar novamente neste aparelho.')
                )
                  revoke.mutate(session.id);
              }}
            >
              Encerrar sessão
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

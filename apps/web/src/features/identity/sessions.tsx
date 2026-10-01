'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result } from './client';
import { Feedback } from './feedback';
import { Button } from '../../ui/Button';

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
      <div className="id-page-header">
        <div>
          <h2 className="id-page-title">Minhas sessões</h2>
          <p className="id-page-subtitle">Encerrar um aparelho não encerra os demais.</p>
        </div>
      </div>

      <Feedback
        error={sessions.error ?? revoke.error}
        success={revoke.isSuccess ? 'Sessão encerrada.' : undefined}
      />

      {sessions.isPending && (
        <p role="status" className="id-status-text">
          Carregando sessões…
        </p>
      )}

      <div className="record-list id-sessions-grid">
        {sessions.data?.map((session) => (
          <article className="panel id-session-card" key={session.id}>
            <div className="id-session-card__header">
              <h3>{session.current ? 'Este aparelho' : 'Outro aparelho'}</h3>
              {session.current && <span className="id-badge-current">Sessão atual</span>}
            </div>

            <div className="id-session-card__details">
              <p className="device">{session.device}</p>
              <p>Entrada em {new Date(session.createdAt).toLocaleString('pt-BR')}</p>
            </div>

            <div className="actions">
              <Button
                variant="danger"
                size="compact"
                disabled={revoke.isPending}
                onClick={() => {
                  if (
                    confirm(
                      'Encerrar esta sessão? Será necessário entrar novamente neste aparelho.',
                    )
                  )
                    revoke.mutate(session.id);
                }}
              >
                Encerrar sessão
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

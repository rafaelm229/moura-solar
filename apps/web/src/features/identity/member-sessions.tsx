'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, type Member } from './client';
import { Feedback } from './feedback';
import { Button } from '../../ui/Button';

export function MemberSessions({ member, onClose }: { member: Member; onClose: () => void }) {
  const client = useQueryClient();
  const sessions = useQuery({
    queryKey: ['member-sessions', member.id],
    queryFn: () =>
      result(
        api.GET('/api/v1/identity/members/{id}/sessions', { params: { path: { id: member.id } } }),
      ),
  });

  const revoke = useMutation({
    mutationFn: (id: string) =>
      result(api.POST('/api/v1/identity/sessions/{id}/revoke', { params: { path: { id } } })),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['member-sessions', member.id] });
      void client.invalidateQueries({ queryKey: ['me'] });
    },
  });

  return (
    <section className="panel id-member-sessions-panel" aria-label={`Sessões de ${member.name}`}>
      <div className="id-page-header">
        <div>
          <h3 className="id-page-title" style={{ fontSize: '18px' }}>
            Sessões de {member.name}
          </h3>
          <p className="id-page-subtitle">Gerencie as sessões ativas do colaborador.</p>
        </div>
        <Button variant="secondary" size="compact" onClick={onClose}>
          Fechar sessões
        </Button>
      </div>

      <Feedback
        error={sessions.error ?? revoke.error}
        success={revoke.isSuccess ? 'Sessão revogada.' : undefined}
      />

      {sessions.isPending && (
        <p role="status" className="id-status-text">
          Carregando sessões…
        </p>
      )}

      {sessions.data?.length === 0 && <p className="id-status-text">Nenhuma sessão ativa.</p>}

      <div className="record-list id-sessions-grid">
        {sessions.data?.map((session) => (
          <article className="panel id-session-card" key={session.id}>
            <div className="id-session-card__details">
              <p className="device">{session.device}</p>
              <p className="id-session-time">
                Entrada em {new Date(session.createdAt).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="actions">
              <Button
                variant="danger"
                size="compact"
                disabled={revoke.isPending}
                onClick={() => {
                  if (confirm(`Revogar esta sessão de ${member.name}?`)) revoke.mutate(session.id);
                }}
              >
                Revogar sessão
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

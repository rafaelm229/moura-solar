'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, type Member } from './client';
import { Feedback } from './feedback';
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
    <section className="panel" aria-label={`Sessões de ${member.name}`}>
      <h3>Sessões de {member.name}</h3>
      <button onClick={onClose}>Fechar sessões</button>
      <Feedback
        error={sessions.error ?? revoke.error}
        success={revoke.isSuccess ? 'Sessão revogada.' : undefined}
      />
      {sessions.isPending && <p>Carregando sessões…</p>}
      {sessions.data?.length === 0 && <p>Nenhuma sessão ativa.</p>}
      {sessions.data?.map((session) => (
        <article className="panel" key={session.id}>
          <p>{session.device}</p>
          <p>{new Date(session.createdAt).toLocaleString('pt-BR')}</p>
          <button
            disabled={revoke.isPending}
            onClick={() => {
              if (confirm(`Revogar esta sessão de ${member.name}?`)) revoke.mutate(session.id);
            }}
          >
            Revogar sessão
          </button>
        </article>
      ))}
    </section>
  );
}

'use client';
import { useQuery } from '@tanstack/react-query';
import { api, result } from './client';
import { Feedback } from './feedback';
export function AuditTrail() {
  const audit = useQuery({
    queryKey: ['audit'],
    queryFn: () => result(api.GET('/api/v1/identity/audit')),
  });
  return (
    <section>
      <h2>Auditoria</h2>
      <p>Últimos 100 eventos permitidos pelo seu escopo.</p>
      <Feedback error={audit.error} />
      {audit.isPending && <p role="status">Carregando histórico…</p>}
      {audit.data?.length === 0 && <p>Nenhum evento disponível no seu escopo.</p>}
      <ol className="record-list">
        {audit.data?.map((event) => (
          <li className="panel" key={event.id}>
            <strong>{event.action}</strong>
            <p>{new Date(event.createdAt).toLocaleString('pt-BR')}</p>
            <p>Responsável: {event.actorId ?? 'Não autenticado'}</p>
            <p>Registro: {event.entityId ?? '—'}</p>
            <small>Referência: {event.traceId}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}

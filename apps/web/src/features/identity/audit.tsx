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
      <div className="id-page-header">
        <div>
          <h2 className="id-page-title">Auditoria</h2>
          <p className="id-page-subtitle">Últimos 100 eventos permitidos pelo seu escopo.</p>
        </div>
      </div>

      <Feedback error={audit.error} />

      {audit.isPending && (
        <p role="status" className="id-status-text">
          Carregando histórico…
        </p>
      )}

      {audit.data?.length === 0 && (
        <p className="id-status-text">Nenhum evento disponível no seu escopo.</p>
      )}

      <ol className="record-list id-audit-list">
        {audit.data?.map((event) => (
          <li className="panel id-audit-item" key={event.id}>
            <div className="id-audit-item__top">
              <strong className="id-audit-action">{event.action}</strong>
              <time className="id-audit-time">
                {new Date(event.createdAt).toLocaleString('pt-BR')}
              </time>
            </div>
            <div className="id-audit-details">
              <p>
                Responsável:{' '}
                <span className="id-audit-val">{event.actorId ?? 'Não autenticado'}</span>
              </p>
              <p>
                Registro: <span className="id-audit-val">{event.entityId ?? '—'}</span>
              </p>
            </div>
            <small className="id-audit-trace">
              Referência: <code>{event.traceId}</code>
            </small>
          </li>
        ))}
      </ol>
    </section>
  );
}

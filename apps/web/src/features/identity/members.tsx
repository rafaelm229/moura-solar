'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, commandHeaders, type Member } from './client';
import { MemberSessions } from './member-sessions';
import { Feedback } from './feedback';
import { Button } from '../../ui/Button';

export function Members() {
  const query = useQueryClient();
  const [link, setLink] = useState('');
  const [sessionMember, setSessionMember] = useState<Member | null>(null);
  const [key, setKey] = useState<string>();

  const members = useQuery({
    queryKey: ['members'],
    queryFn: () => result(api.GET('/api/v1/identity/members')),
  });

  const roles = useQuery({
    queryKey: ['roles'],
    queryFn: () => result(api.GET('/api/v1/identity/roles')),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<{
    name: string;
    email: string;
    roleId: string;
  }>({ defaultValues: { name: '', email: '', roleId: '' } });

  const invite = useMutation({
    mutationFn: (body: { name: string; email: string; roleId: string }) => {
      const id = key ?? crypto.randomUUID();
      setKey(id);
      return result(
        api.POST('/api/v1/identity/invitations', {
          body,
          params: { header: { 'idempotency-key': id } },
        }),
      );
    },
    onSuccess: (data) => {
      setLink(`${location.origin}/#access=${data.token}`);
      setKey(undefined);
      reset();
      void query.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const action = useMutation({
    mutationFn: async ({
      member,
      kind,
      roleId,
    }: {
      member: Member;
      kind: string;
      roleId?: string;
    }) => {
      if (kind === 'recovery') {
        const data = await result(
          api.POST('/api/v1/identity/members/{id}/recovery', {
            params: { path: { id: member.id }, header: commandHeaders() },
          }),
        );
        setLink(`${location.origin}/#access=${data.token}`);
        return;
      }
      await result(
        api.PATCH('/api/v1/identity/members/{id}', {
          params: { path: { id: member.id }, header: commandHeaders() },
          body: {
            version: member.version,
            roleId: roleId ?? member.roleId,
            status: kind === 'block' ? 'blocked' : 'active',
          },
        }),
      );
    },
    onSuccess: () => {
      void query.invalidateQueries({ queryKey: ['members'] });
    },
  });

  return (
    <section>
      <div className="id-page-header">
        <div>
          <h2 className="id-page-title">Equipe e acessos</h2>
          <p className="id-page-subtitle">Convide pessoas e defina o acesso à organização.</p>
        </div>
      </div>

      {sessionMember && (
        <MemberSessions member={sessionMember} onClose={() => setSessionMember(null)} />
      )}

      <form
        className="panel form-grid id-invite-form"
        data-dirty={isDirty}
        onSubmit={handleSubmit((body) => invite.mutate(body))}
        onChange={() => setKey(undefined)}
      >
        <h3>Convidar pessoa</h3>
        <div className="id-form-row">
          <div className="id-field">
            <label htmlFor="member-name">Nome</label>
            <input
              id="member-name"
              className="ui-input"
              required
              maxLength={100}
              {...register('name')}
            />
          </div>

          <div className="id-field">
            <label htmlFor="member-email">E-mail</label>
            <input
              id="member-email"
              className="ui-input"
              required
              type="email"
              {...register('email')}
            />
          </div>

          <div className="id-field">
            <label htmlFor="member-role">Papel</label>
            <select id="member-role" className="ui-input" required {...register('roleId')}>
              <option value="">Selecione</option>
              {roles.data?.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Button type="submit" variant="primary" disabled={invite.isPending || !roles.data}>
            {invite.isPending ? 'Gerando…' : 'Gerar convite'}
          </Button>
        </div>

        <Feedback error={invite.error ?? roles.error} />
      </form>

      {link && (
        <div className="panel id-link-panel">
          <p role="status" className="id-status-text">
            Link pronto. Entregue-o diretamente à pessoa; ele permite definir a senha.
          </p>
          <div className="id-link-box">
            <label htmlFor="member-link">Link de acesso</label>
            <input
              id="member-link"
              className="ui-input id-link-input"
              readOnly
              value={link}
              onFocus={(event) => event.target.select()}
            />
          </div>
          <div className="actions">
            <Button variant="secondary" size="compact" type="button" onClick={() => setLink('')}>
              Ocultar link
            </Button>
          </div>
        </div>
      )}

      <Feedback
        error={members.error ?? action.error}
        success={action.isSuccess ? 'Acesso atualizado.' : undefined}
      />

      {members.isPending && (
        <p role="status" className="id-status-text">
          Carregando equipe…
        </p>
      )}

      {members.data?.length === 0 && <p className="id-status-text">Nenhuma pessoa cadastrada.</p>}

      <div className="record-list id-members-grid">
        {members.data?.map((member) => (
          <article className="panel id-member-card" key={member.id}>
            <div className="id-member-card__header">
              <div className="id-member-avatar" aria-hidden="true">
                {member.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="id-member-info">
                <h3 className="id-member-name">{member.name}</h3>
                <p className="id-member-email">{member.email}</p>
              </div>
              <span className={`id-status-badge id-status-badge--${member.status}`}>
                {member.status === 'active'
                  ? 'Ativo'
                  : member.status === 'blocked'
                    ? 'Bloqueado'
                    : 'Convite pendente'}
              </span>
            </div>

            <p className="id-member-role-label">
              {member.roleName} ·{' '}
              {member.status === 'active'
                ? 'Ativo'
                : member.status === 'blocked'
                  ? 'Bloqueado'
                  : 'Convite pendente'}
            </p>

            <div>
              <Button variant="secondary" size="compact" onClick={() => setSessionMember(member)}>
                Ver sessões de {member.name}
              </Button>
            </div>

            <div className="actions">
              <Button
                variant={member.status === 'blocked' ? 'secondary' : 'danger'}
                size="compact"
                disabled={action.isPending}
                onClick={() => {
                  if (
                    confirm(
                      `${member.status === 'blocked' ? 'Desbloquear' : 'Bloquear'} ${member.name}? As sessões ativas serão encerradas.`,
                    )
                  )
                    action.mutate({
                      member,
                      kind: member.status === 'blocked' ? 'unblock' : 'block',
                    });
                }}
              >
                {member.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
              </Button>
              <Button
                variant="secondary"
                size="compact"
                disabled={action.isPending || member.status === 'blocked'}
                onClick={() => action.mutate({ member, kind: 'recovery' })}
              >
                Gerar link de acesso
              </Button>
            </div>

            {member.status === 'active' && (
              <div className="id-role-change">
                <label htmlFor={`change-role-${member.id}`}>Alterar papel</label>
                <select
                  id={`change-role-${member.id}`}
                  className="ui-input"
                  value={member.roleId}
                  disabled={action.isPending}
                  onChange={(event) => {
                    if (confirm(`Alterar o papel de ${member.name} e encerrar suas sessões?`))
                      action.mutate({ member, kind: 'role', roleId: event.target.value });
                  }}
                >
                  {roles.data?.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

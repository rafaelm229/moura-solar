'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, commandHeaders, type Member } from './client';
import { MemberSessions } from './member-sessions';
import { Feedback } from './feedback';
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
      <h2>Equipe e acessos</h2>
      {sessionMember && (
        <MemberSessions member={sessionMember} onClose={() => setSessionMember(null)} />
      )}
      <p>Convide pessoas e defina o acesso à organização.</p>
      <form
        className="panel form-grid"
        data-dirty={isDirty}
        onSubmit={handleSubmit((body) => invite.mutate(body))}
        onChange={() => setKey(undefined)}
      >
        <h3>Convidar pessoa</h3>
        <label>
          Nome
          <input required maxLength={100} {...register('name')} />
        </label>
        <label>
          E-mail
          <input required type="email" {...register('email')} />
        </label>
        <label>
          Papel
          <select required {...register('roleId')}>
            <option value="">Selecione</option>
            {roles.data?.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <button disabled={invite.isPending || !roles.data}>
          {invite.isPending ? 'Gerando…' : 'Gerar convite'}
        </button>
        <Feedback error={invite.error ?? roles.error} />
      </form>
      {link && (
        <div className="panel">
          <p role="status">
            Link pronto. Entregue-o diretamente à pessoa; ele permite definir a senha.
          </p>
          <label>
            Link de acesso
            <input readOnly value={link} onFocus={(event) => event.target.select()} />
          </label>
          <button type="button" onClick={() => setLink('')}>
            Ocultar link
          </button>
        </div>
      )}
      <Feedback
        error={members.error ?? action.error}
        success={action.isSuccess ? 'Acesso atualizado.' : undefined}
      />
      {members.isPending && <p role="status">Carregando equipe…</p>}
      {members.data?.length === 0 && <p>Nenhuma pessoa cadastrada.</p>}
      <div className="record-list">
        {members.data?.map((member) => (
          <article className="panel" key={member.id}>
            <h3>{member.name}</h3>
            <button onClick={() => setSessionMember(member)}>Ver sessões de {member.name}</button>
            <p>{member.email}</p>
            <p>
              {member.roleName} ·{' '}
              {member.status === 'active'
                ? 'Ativo'
                : member.status === 'blocked'
                  ? 'Bloqueado'
                  : 'Convite pendente'}
            </p>
            <div className="actions">
              <button
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
              </button>
              <button
                disabled={action.isPending || member.status === 'blocked'}
                onClick={() => action.mutate({ member, kind: 'recovery' })}
              >
                Gerar link de acesso
              </button>
            </div>
            {member.status === 'active' && (
              <label>
                Alterar papel
                <select
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
              </label>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

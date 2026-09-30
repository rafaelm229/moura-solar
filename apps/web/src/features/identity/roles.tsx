'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, commandHeaders, type Grant, type Role } from './client';
import { Feedback } from './feedback';
const scopes = [
  { value: 'own', label: 'Próprio' },
  { value: 'team', label: 'Equipe' },
  { value: 'organization', label: 'Organização' },
  { value: 'assigned', label: 'Designado' },
  { value: 'linked', label: 'Vinculado' },
  { value: 'domain', label: 'Domínio' },
] as const;
export function Roles() {
  const client = useQueryClient();
  const roles = useQuery({
    queryKey: ['roles'],
    queryFn: () => result(api.GET('/api/v1/identity/roles')),
  });
  const permissions = useQuery({
    queryKey: ['permissions'],
    queryFn: () => result(api.GET('/api/v1/identity/permissions')),
  });
  const [editing, setEditing] = useState<Role | null>();
  const [name, setName] = useState('');
  const [grants, setGrants] = useState<Grant[]>([]);
  const [filter, setFilter] = useState('');
  const save = useMutation({
    mutationFn: () => {
      const body = { name, grants, ...(editing ? { version: editing.version } : {}) };
      return editing
        ? result(
            api.PATCH('/api/v1/identity/roles/{id}', {
              params: { path: { id: editing.id }, header: commandHeaders() },
              body,
            }),
          )
        : result(
            api.POST('/api/v1/identity/roles', { params: { header: commandHeaders() }, body }),
          );
    },
    onSuccess: () => {
      setEditing(undefined);
      void client.invalidateQueries({ queryKey: ['roles'] });
      void client.invalidateQueries({ queryKey: ['me'] });
    },
  });
  return (
    <section>
      <h2>Papéis e permissões</h2>
      <p>Alterações encerram as sessões das pessoas afetadas.</p>
      <Feedback
        error={roles.error ?? permissions.error ?? save.error}
        success={save.isSuccess ? 'Papel salvo.' : undefined}
      />
      {editing === undefined ? (
        <>
          <button
            onClick={() => {
              setEditing(null);
              setName('');
              setGrants([]);
            }}
          >
            Criar papel
          </button>
          <div className="record-list">
            {roles.data?.map((role) => (
              <article className="panel" key={role.id}>
                <h3>{role.name}</h3>
                <p>{role.grants.length} permissões</p>
                <button
                  onClick={() => {
                    setEditing(role);
                    setName(role.name);
                    setGrants(role.grants);
                  }}
                >
                  Editar {role.name}
                </button>
              </article>
            ))}
          </div>
          {roles.isPending && <p>Carregando papéis…</p>}
        </>
      ) : (
        <form
          data-dirty="true"
          className="panel"
          onSubmit={(event) => {
            event.preventDefault();
            if (confirm('Salvar permissões e encerrar as sessões afetadas?')) save.mutate();
          }}
        >
          <h3>{editing ? 'Editar papel' : 'Novo papel'}</h3>
          <label>
            Nome do papel
            <input
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Filtrar permissões
            <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </label>
          <div className="permission-list">
            {permissions.data
              ?.filter((permission) => permission.includes(filter))
              .map((permission) => (
                <label key={permission}>
                  {permission}
                  <select
                    value={grants.find((g) => g.permission === permission)?.scope ?? ''}
                    onChange={(e) =>
                      setGrants((old) => [
                        ...old.filter((g) => g.permission !== permission),
                        ...(e.target.value
                          ? [{ permission, scope: e.target.value as Grant['scope'] }]
                          : []),
                      ])
                    }
                  >
                    <option value="">Negado</option>
                    {scopes.map((scope) => (
                      <option key={scope.value} value={scope.value}>
                        {scope.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
          </div>
          <div className="actions">
            <button
              type="button"
              onClick={() => {
                if (confirm('Descartar alterações deste papel?')) setEditing(undefined);
              }}
            >
              Cancelar
            </button>
            <button disabled={save.isPending}>
              {save.isPending ? 'Salvando…' : 'Salvar papel'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, commandHeaders, type Grant, type Role } from './client';
import { Feedback } from './feedback';
import { Button } from '../../ui/Button';

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
      <div className="id-page-header">
        <div>
          <h2 className="id-page-title">Papéis e permissões</h2>
          <p className="id-page-subtitle">Alterações encerram as sessões das pessoas afetadas.</p>
        </div>
        {editing === undefined && (
          <Button
            variant="primary"
            onClick={() => {
              setEditing(null);
              setName('');
              setGrants([]);
            }}
          >
            Criar papel
          </Button>
        )}
      </div>

      <Feedback
        error={roles.error ?? permissions.error ?? save.error}
        success={save.isSuccess ? 'Papel salvo.' : undefined}
      />

      {editing === undefined ? (
        <>
          {roles.isPending && (
            <p role="status" className="id-status-text">
              Carregando papéis…
            </p>
          )}

          <div className="record-list id-roles-grid">
            {roles.data?.map((role) => (
              <article className="panel id-role-card" key={role.id}>
                <div>
                  <h3>{role.name}</h3>
                  <p className="id-role-count">{role.grants.length} permissões</p>
                </div>
                <div className="actions">
                  <Button
                    variant="secondary"
                    size="compact"
                    onClick={() => {
                      setEditing(role);
                      setName(role.name);
                      setGrants(role.grants);
                    }}
                  >
                    Editar {role.name}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <form
          data-dirty="true"
          className="panel id-role-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (confirm('Salvar permissões e encerrar as sessões afetadas?')) save.mutate();
          }}
        >
          <h3>{editing ? 'Editar papel' : 'Novo papel'}</h3>

          <div className="id-form-row">
            <div className="id-field">
              <label htmlFor="role-name">Nome do papel</label>
              <input
                id="role-name"
                className="ui-input"
                required
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="id-field">
              <label htmlFor="filter-permissions">Filtrar permissões</label>
              <input
                id="filter-permissions"
                className="ui-input"
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Buscar permissão..."
              />
            </div>
          </div>

          <div className="permission-list id-permissions-grid">
            {permissions.data
              ?.filter((permission) => permission.includes(filter))
              .map((permission) => (
                <div className="id-permission-card" key={permission}>
                  <label htmlFor={`perm-${permission}`} className="id-permission-label">
                    {permission}
                  </label>
                  <select
                    id={`perm-${permission}`}
                    aria-label={permission}
                    className="ui-input id-permission-select"
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
                </div>
              ))}
          </div>

          <div className="actions">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                if (confirm('Descartar alterações deste papel?')) setEditing(undefined);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={save.isPending}>
              {save.isPending ? 'Salvando…' : 'Salvar papel'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

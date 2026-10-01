'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, commandHeaders, type Team } from './client';
import { Feedback } from './feedback';
import { Button } from '../../ui/Button';

export function Teams() {
  const client = useQueryClient();
  const teams = useQuery({
    queryKey: ['teams'],
    queryFn: () => result(api.GET('/api/v1/identity/teams')),
  });

  const members = useQuery({
    queryKey: ['team-candidates'],
    queryFn: () => result(api.GET('/api/v1/identity/team-candidates')),
  });

  const [editing, setEditing] = useState<Team | null>();
  const [name, setName] = useState('');
  const [ids, setIds] = useState<string[]>([]);

  const save = useMutation({
    mutationFn: () =>
      editing
        ? result(
            api.PATCH('/api/v1/identity/teams/{id}', {
              params: { path: { id: editing.id }, header: commandHeaders() },
              body: { name, memberIds: ids, version: editing.version },
            }),
          )
        : result(
            api.POST('/api/v1/identity/teams', {
              params: { header: commandHeaders() },
              body: { name, memberIds: ids },
            }),
          ),
    onSuccess: () => {
      setEditing(undefined);
      void client.invalidateQueries({ queryKey: ['teams'] });
    },
  });

  return (
    <section>
      <div className="id-page-header">
        <div>
          <h2 className="id-page-title">Equipes de trabalho</h2>
          <p className="id-page-subtitle">
            Organize os colaboradores por regiões, setores ou metas.
          </p>
        </div>
        {editing === undefined && (
          <Button
            variant="primary"
            onClick={() => {
              setEditing(null);
              setName('');
              setIds([]);
            }}
          >
            Criar equipe
          </Button>
        )}
      </div>

      <Feedback
        error={teams.error ?? members.error ?? save.error}
        success={save.isSuccess ? 'Equipe salva.' : undefined}
      />

      {editing === undefined ? (
        <>
          {teams.isPending && (
            <p role="status" className="id-status-text">
              Carregando equipes…
            </p>
          )}

          {teams.data?.length === 0 && <p className="id-status-text">Nenhuma equipe criada.</p>}

          <div className="record-list id-teams-grid">
            {teams.data?.map((team) => (
              <article className="panel id-team-card" key={team.id}>
                <div>
                  <h3>{team.name}</h3>
                  <p className="id-team-count">{team.memberIds.length} pessoas</p>
                </div>
                <div className="actions">
                  <Button
                    variant="secondary"
                    size="compact"
                    onClick={() => {
                      setEditing(team);
                      setName(team.name);
                      setIds(team.memberIds);
                    }}
                  >
                    Editar equipe
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <form
          data-dirty="true"
          className="panel id-team-form"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <h3>{editing ? 'Editar equipe' : 'Nova equipe'}</h3>

          <div className="id-field">
            <label htmlFor="team-name">Nome da equipe</label>
            <input
              id="team-name"
              className="ui-input"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <fieldset className="id-fieldset">
            <legend>Pessoas da equipe</legend>
            <div className="id-checkbox-grid">
              {members.data?.map((member) => (
                <label className="check-row id-check-item" key={member.id}>
                  <input
                    type="checkbox"
                    checked={ids.includes(member.id)}
                    onChange={(e) =>
                      setIds((old) =>
                        e.target.checked
                          ? [...old, member.id]
                          : old.filter((id) => id !== member.id),
                      )
                    }
                  />
                  <span>{member.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="actions">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                if (confirm('Descartar alterações da equipe?')) setEditing(undefined);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={save.isPending}>
              Salvar equipe
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, result, commandHeaders, type Team } from './client';
import { Feedback } from './feedback';
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
      <h2>Equipes de trabalho</h2>
      <Feedback
        error={teams.error ?? members.error ?? save.error}
        success={save.isSuccess ? 'Equipe salva.' : undefined}
      />
      {editing === undefined ? (
        <>
          <button
            onClick={() => {
              setEditing(null);
              setName('');
              setIds([]);
            }}
          >
            Criar equipe
          </button>
          {teams.isPending && <p>Carregando equipes…</p>}
          {teams.data?.length === 0 && <p>Nenhuma equipe criada.</p>}
          <div className="record-list">
            {teams.data?.map((team) => (
              <article className="panel" key={team.id}>
                <h3>{team.name}</h3>
                <p>{team.memberIds.length} pessoas</p>
                <button
                  onClick={() => {
                    setEditing(team);
                    setName(team.name);
                    setIds(team.memberIds);
                  }}
                >
                  Editar equipe
                </button>
              </article>
            ))}
          </div>
        </>
      ) : (
        <form
          data-dirty="true"
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <label>
            Nome da equipe
            <input
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <fieldset>
            <legend>Pessoas da equipe</legend>
            {members.data?.map((member) => (
              <label className="check-row" key={member.id}>
                <input
                  type="checkbox"
                  checked={ids.includes(member.id)}
                  onChange={(e) =>
                    setIds((old) =>
                      e.target.checked ? [...old, member.id] : old.filter((id) => id !== member.id),
                    )
                  }
                />
                {member.name}
              </label>
            ))}
          </fieldset>
          <div className="actions">
            <button
              type="button"
              onClick={() => {
                if (confirm('Descartar alterações da equipe?')) setEditing(undefined);
              }}
            >
              Cancelar
            </button>
            <button disabled={save.isPending}>Salvar equipe</button>
          </div>
        </form>
      )}
    </section>
  );
}

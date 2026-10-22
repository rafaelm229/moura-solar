# R1-23 — Contrato e outbox local para atualização de oportunidade

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #53, merge commit `b0b2940`; CI completa verde.

**SPECs:** [SPEC-001](../specs/SPEC-001-jornada-cliente/spec.md),
[SPEC-004](../specs/SPEC-004-clientes-oportunidades/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-023](adr/ADR-023-outbox-atualizacao-oportunidade.md).

**Dependências:** R1-22 consolidado; atualização versionada e auditoria já são
persistidas na mesma transação local e o endpoint exige `opportunities:update`.

## Antes/depois

- **Antes:** atualização validava organização e `expectedVersion`, incrementava
  versão e gravava auditoria, mas não persistia evento de integração.
- **Depois:** `OPPORTUNITY_UPDATED` v1 é inserido na mesma transação local da
  atualização e auditoria.
- **Semântica:** registra a atualização aceita; não altera autorização, estado,
  gates, regras, resposta, versão ou comportamento de concorrência.
- **Payload:** `opportunityId`, `customerId` e `auditEventId`; sem título,
  necessidade, consumo, prioridade ou valores comerciais.
- **Correlação/deduplicação:** `requestId` do comando e ID imutável da auditoria.
- **Migração:** nenhuma; usa `IntegrationOutbox` e `AuditEvent` existentes.
- **Ativação:** evento não publicado, sem dispatcher, consumidor, broker ou
  integração externa.

## Critérios de aceite

- Contrato v1 exige os três IDs, corresponde o agregado a `opportunityId` e
  rejeita tipo, versão ou campos adicionais inválidos.
- Integração preserva autorização e controle de versão e confirma correlação,
  auditoria, payload mínimo e `publishedAt` nulo.
- Falha forçada da outbox reverte campos, versão e auditoria.
- Conflito de versão não altera oportunidade nem cria duplicata de evento.
- `pnpm check`, build/testes de contratos, integração comercial com PostgreSQL e
  MinIO locais, CI completa, links locais, Prettier e `git diff --check`.
- Rollback remove somente produtor e contrato novos; preserva dados, auditoria e
  histórico existentes.

## Evidência e limites

`@moura-solar/contracts` passou 48/48 testes e a API compilou. A integração
comercial passou 15/15 com PostgreSQL/MinIO locais, incluindo 401 sem sessão,
rollback forçado da outbox, correlação, payload sem texto ou valores comerciais
e 409 por versão obsoleta. `pnpm check` passou: Prettier, lint, typecheck,
1.257 testes da API, 48 testes de contratos, 5 web, 24 testes offline do
harness histórico da PoC e build. Links locais, Prettier e `git diff --check`
passaram. CI #109 concluiu com sucesso, incluindo geração de API, migrations,
integração e E2E. O PR #53 foi consolidado na branch de feature em `b0b2940`.
Nenhuma migration; nenhum consumidor ou publicação é ativado. A importação e
leitura de contas seguem manuais conforme ADR-008.

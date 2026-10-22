# R1-22 — Contrato e outbox local para atualização de cliente

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #51, merge commit `03363d8`; CI completa verde.

**SPECs:** [SPEC-004](../specs/SPEC-004-clientes-oportunidades/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-022](adr/ADR-022-outbox-atualizacao-cliente.md).

**Dependências:** R1-21 consolidado; atualização versionada e auditoria já são
persistidas na mesma transação local e o endpoint exige `customers:update`.

## Antes/depois

- **Antes:** atualização validava a versão, incrementava o cliente e registrava
  auditoria, sem evento de integração.
- **Depois:** `CUSTOMER_UPDATED` v1 é inserido na mesma transação local da
  atualização e auditoria.
- **Semântica:** registra a atualização aceita; não altera autorização, regras,
  resposta, versão ou comportamento de concorrência.
- **Payload:** `customerId` e `auditEventId`; sem nome, documento, observações
  ou demais dados pessoais/comerciais.
- **Correlação/deduplicação:** `requestId` do comando e ID imutável da auditoria.
- **Migração:** nenhuma; usa `IntegrationOutbox` e `AuditEvent` existentes.
- **Ativação:** evento não publicado, sem dispatcher, consumidor, broker ou
  integração externa.

## Critérios de aceite

- Contrato v1 exige os dois IDs, corresponde o agregado a `customerId` e rejeita
  tipo, versão ou campos adicionais inválidos.
- Integração preserva autorização e controle de versão e confirma correlação,
  auditoria, payload mínimo e `publishedAt` nulo.
- Falha forçada da outbox reverte dados, versão e auditoria.
- Conflito de versão não altera cliente nem cria duplicata de evento.
- `pnpm check`, build/testes de contratos, integração comercial com PostgreSQL e
  MinIO locais, CI completa, links locais, Prettier e `git diff --check`.
- Rollback remove somente produtor e contrato novos; preserva dados, auditoria e
  histórico existentes.

## Evidência e limites

`@moura-solar/contracts` passou 47/47 testes e a API compilou. A integração
comercial passou 14/14 com PostgreSQL/MinIO locais, incluindo 401 sem sessão,
rollback forçado da outbox, correlação, payload sem PII e 409 por versão
obsoleta. `pnpm check` passou: Prettier, lint, typecheck, 1.257 testes da API,
47 testes de contratos, 5 web, 24 testes offline do harness histórico da PoC e
build. Links locais, Prettier e `git diff --check` passaram. CI #107 concluiu
com sucesso, incluindo geração de API, migrations, integração e E2E. O PR #51
foi consolidado na branch de feature em `03363d8`. Nenhuma migration; nenhum
consumidor ou publicação é ativado. A importação e leitura de contas seguem
manuais conforme ADR-008.

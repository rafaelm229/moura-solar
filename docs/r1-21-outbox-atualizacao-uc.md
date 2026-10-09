# R1-21 — Contrato e outbox local para atualização de unidade consumidora

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #49, merge commit `bd3029d`; CI completa verde.

**SPECs:** [SPEC-004](../specs/SPEC-004-clientes-oportunidades/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-021](adr/ADR-021-outbox-atualizacao-uc.md).

**Dependências:** R1-20 consolidado; atualização versionada e auditoria já são
persistidas na mesma transação local e o endpoint já exige `consumer_units:manage`.

## Antes/depois

- **Antes:** a atualização validava organização e `expectedVersion`, incrementava
  versão e registrava auditoria, mas não persistia evento de integração.
- **Depois:** `UTILITY_UNIT_UPDATED` v1 é inserido na mesma transação da
  atualização e auditoria.
- **Semântica:** registra a atualização aceita; não altera regra, permissão,
  resposta, versão ou comportamento de concorrência.
- **Payload:** `utilityUnitId`, `customerId` e `auditEventId`; sem dados da conta
  nem detalhes técnicos ou tarifários.
- **Correlação/deduplicação:** `requestId` do comando e ID imutável de `AuditEvent`.
- **Migração:** nenhuma; usa `IntegrationOutbox` e `AuditEvent` existentes.
- **Ativação:** evento não publicado, sem dispatcher, consumidor, broker ou
  integração externa.

## Critérios de aceite

- Contrato v1 exige os três IDs, corresponde o agregado a `utilityUnitId` e
  rejeita tipo, versão ou campos adicionais inválidos.
- Integração preserva autorização e controle de versão e confirma correlação,
  auditoria, payload mínimo e `publishedAt` nulo.
- Falha forçada da outbox reverte campos, versão e auditoria.
- Conflito de versão não altera UC nem cria duplicata de evento.
- `pnpm check`, build/testes de contratos, integração comercial com PostgreSQL e
  MinIO locais, CI completa, links locais, Prettier e `git diff --check`.
- Rollback remove somente produtor e contrato novos; preserva dados, auditoria e
  histórico existentes.

## Evidência e limites

`@moura-solar/contracts` passou 46/46 testes e a API compilou. A integração
comercial passou 13/13 com PostgreSQL/MinIO locais, incluindo 401 sem sessão,
rollback forçado da outbox, correlação, payload mínimo e 409 por versão obsoleta.
`pnpm check` passou: Prettier, lint, typecheck, 1.257 testes da API, 46 testes
de contratos, 5 web, 24 testes offline do harness histórico da PoC e build.
Links locais, Prettier dos documentos afetados e `git diff --check` passaram.
CI #105 concluiu com sucesso, incluindo geração de API, migrations, integração e
E2E. O PR #49 foi consolidado na branch de feature em `bd3029d`. Nenhuma
migration; nenhum consumidor ou publicação é ativado. A importação e leitura de
contas seguem manuais conforme ADR-008.

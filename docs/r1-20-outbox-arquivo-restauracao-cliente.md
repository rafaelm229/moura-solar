# R1-20 — Contratos e outbox local para ciclo de vida do cliente

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #48, merge commit `d4f1d8e`; CI completa verde.

**SPECs:** [SPEC-004](../specs/SPEC-004-clientes-oportunidades/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-020](adr/ADR-020-outbox-arquivo-restauracao-cliente.md).

**Dependências:** R1-19 consolidado; arquivamento/restauração já atualizam
Customer e auditam na transação local, com permissões distintas e controle de
versão.

## Antes/depois

- **Antes:** arquivar valida oportunidades ativas e versão, marca o cliente
  `ARCHIVED` com `archivedAt`; restaurar valida a versão e volta a `ACTIVE`.
  Ambos registram auditoria, mas não escrevem evento na outbox.
- **Depois:** `CUSTOMER_ARCHIVED` ou `CUSTOMER_RESTORED` v1 acompanha seus efeitos
  existentes na mesma transação local.
- **Semântica:** nenhuma mudança em autorização, gates, status, versão ou
  tratamento de oportunidades relacionadas.
- **Payload:** `customerId` e `auditEventId`; sem nome, documento, contato ou
  qualquer outro dado pessoal.
- **Correlação/deduplicação:** `requestId` e ID imutável da auditoria.
- **Migração:** nenhuma; reutiliza `IntegrationOutbox` e `AuditEvent`.
- **Ativação:** eventos não publicados, sem dispatcher, consumidor, broker ou
  chamada externa.

## Critérios de aceite

- Contratos v1 aceitam somente os respectivos tipos, versão 1, `customerId` que
  corresponde ao agregado e `auditEventId`; rejeitam campos adicionais.
- Testes cobrem a permissão existente e o bloqueio de arquivamento com
  oportunidades ativas.
- Integração confirma correlação, vínculo da auditoria, payload mínimo e
  `publishedAt` nulo para arquivo e restauração.
- Falha forçada da outbox reverte status, versão, `archivedAt` e auditoria em
  ambas as operações.
- `pnpm check`, contratos, integração comercial com PostgreSQL/MinIO, CI completa,
  links locais, Prettier e `git diff --check`.
- Rollback remove somente os produtores/contratos novos; preserva auditoria e
  histórico atual.

## Evidência e limites

Os testes de `@moura-solar/contracts` passaram (45/45); build da API passou;
`tests/commercial.integration.mjs` passou 12/12 com PostgreSQL/MinIO locais,
incluindo gate de oportunidades ativas, correlação e rollback de arquivo e
restauração. `pnpm check` passou em formatação, lint, typecheck, 1.257 testes da
API, 5 da web, 24 testes offline do harness histórico da PoC e build. Prettier,
links locais e `git diff --check` passaram. CI #104 concluiu com sucesso,
incluindo `pnpm check`, geração de API, migrations, integrações e E2E. O PR #48
foi consolidado na branch de feature em `d4f1d8e`. Nenhuma migration; R1
permanece em andamento. A importação de contas continua manual
conforme ADR-008, fora do escopo deste incremento.

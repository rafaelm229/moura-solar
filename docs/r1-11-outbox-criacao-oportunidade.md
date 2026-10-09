# R1-11 — Contrato e outbox local para criação de oportunidade

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Validado localmente na branch `codex/r1-11-opportunity-created`.

**SPECs:** [SPEC-004](../specs/SPEC-004-clientes-oportunidades/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisões:** [ADR-011](adr/ADR-011-outbox-local-oportunidade.md).

**Dependências:** R1-08/09 e R1-10 consolidados em
`feat/proposal-visual-clarity`; `CommercialService.createOpportunity` como fonte
do fato e `requestId` como correlação.

## Antes/depois

- **Antes:** oportunidade, primeira atividade, transição `NOVO` e auditoria são
  persistidas na mesma transação; não havia evento de integração para o fato.
- **Depois:** `packages/contracts` valida `OPPORTUNITY_CREATED` v1 e a API grava
  um evento mínimo na `IntegrationOutbox` dentro da transação existente.
- **Contrato:** payload traz IDs de oportunidade e cliente, mais o ID opcional da
  UC. Não traz texto comercial ou PII.
- **Migração:** nenhuma. Usa a `IntegrationOutbox` existente.
- **Comportamento de domínio:** resposta HTTP, criação de atividade, transição,
  auditoria, gates e política de atribuição preservados.
- **Ativação:** evento fica não publicado. Sem polling, dispatcher, worker,
  consumidor, retries, replay, broker, serviço extraído ou integração externa.

## Critérios de aceite

- Parser aceita v1 com ou sem UC e rejeita tipo/versão/IDs inconsistentes, payload
  incompleto ou campos não aprovados.
- Integração confirma correlação e ausência de título/resumo/atividade no evento.
- Falha de inserção reverte oportunidade, atividade, transição e auditoria.
- `pnpm check`, `pnpm test:integration` e `git diff --check`.
- Rollback retira produtor sem excluir linhas ou estrutura da outbox.

## Evidência e limites

O fato já existia em `commercial.opportunity_created`; este incremento adiciona
registro durável local sem alterar a máquina de estados. Consumidor, transporte,
inbox, retry operacional, retenção final, replay e reconciliação continuam
pendentes em R1.

Validações locais: `@moura-solar/contracts` (5 arquivos de teste), integração de
CRM (10/10), `pnpm check` (format/lint/types/tests/build), links locais e
`git diff --check` passaram. A integração usou PostgreSQL Compose e limpou apenas
o schema efêmero; o container foi parado sem remover o volume. CI remota será
executada no PR deste incremento.

# R1-10 — Contrato e outbox local para cadastro de cliente

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado em `feat/proposal-visual-clarity` pelo PR #35
(`4607133`).

**SPECs:** [SPEC-004](../specs/SPEC-004-clientes-oportunidades/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisões:** [ADR-010](adr/ADR-010-outbox-local-cliente.md).

**Dependências:** R1-08 contrato de aceite e R1-09 outbox local consolidados na
`feat/proposal-visual-clarity`; `CommercialService.createCustomer` como fonte do
fato e `requestId` como correlação.

## Antes/depois

- **Antes:** o cadastro transacional de cliente grava entidade/contatos/endereço
  e auditoria; não havia evento de integração para o fato.
- **Depois:** `packages/contracts` valida `CUSTOMER_CREATED` v1 e a API grava um
  evento mínimo na `IntegrationOutbox` dentro da mesma transação.
- **Contrato:** payload contém somente `customerId`; o envelope carrega
  organização, cliente/agregado, produtor, correlação e instante de criação.
- **Migração:** nenhuma. Usa a tabela `IntegrationOutbox` existente.
- **Comportamento de domínio:** resposta HTTP, cadastro, contatos, endereço,
  duplicidade e auditoria permanecem com a semântica atual.
- **Ativação:** evento fica não publicado. Sem polling, dispatcher, worker,
  consumidor, retries, replay, broker, serviço extraído ou integração externa.

## Critérios de aceite

- Parser aceita o evento v1 e rejeita tipo/versão/payload inválidos.
- Integração verifica agregado, correlação e payload sem PII.
- Falha de inserção da outbox reverte o cadastro e a própria linha de evento.
- `pnpm check`, `pnpm test:integration` e `git diff --check`.
- Rollback retira o produtor sem excluir linhas ou estrutura da outbox.

## Evidência e limites

O fato de negócio já existia em `commercial.customer_created`; este incremento
adiciona emissão durável local sem alterar suas regras. Linhas de cliente e evento
só garantem atomicidade no PostgreSQL atual. Transporte, consumidor, inbox,
retries operacionais, retenção final, replay e reconciliação continuam pendentes
em R1.

Validações locais: `@moura-solar/contracts` (4 arquivos de teste), integração de
CRM (9/9), `pnpm check` (format/lint/types/tests/build), links locais e
`git diff --check` passaram. A integração usou PostgreSQL Compose e limpou apenas
o schema efêmero; o container foi parado sem remover o volume. CI remota ainda
passou em todas as etapas no commit `cc3b68a` do PR #35, incluindo migrations,
integração e E2E. O PR foi squash-merged em `4607133`; não houve deploy.

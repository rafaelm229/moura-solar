# R1-12 — Contrato e outbox local para criação de UC

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Validado localmente na branch `codex/r1-12-utility-unit-created`.

**SPECs:** [SPEC-004](../specs/SPEC-004-clientes-oportunidades/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisões:** [ADR-012](adr/ADR-012-outbox-local-unidade-consumidora.md).

**Dependências:** R1-08/09, R1-10 e R1-11 consolidados em
`feat/proposal-visual-clarity`; `CommercialService.createUtilityUnitInTransaction`
como fonte do fato e `requestId` como correlação.

## Antes/depois

- **Antes:** UC, auditoria e, no comando combinado, vínculo com oportunidade
  persistem na transação existente; não havia evento de integração do fato.
- **Depois:** `packages/contracts` valida `UTILITY_UNIT_CREATED` v1 e a API grava
  evento mínimo na `IntegrationOutbox` dentro da transação compartilhada pelos
  caminhos de criação direta e criação/vínculo.
- **Contrato:** payload traz somente `utilityUnitId`, `customerId` e ID opcional
  de endereço. Não traz código da conta, distribuidora ou endereço legível.
- **Migração:** nenhuma. Usa a `IntegrationOutbox` existente.
- **Comportamento de domínio:** autorização, validações de ownership e duplicidade,
  resposta HTTP e vínculo existentes preservados.
- **Ativação:** evento permanece não publicado. Sem polling, dispatcher, worker,
  consumidor, retries, replay, broker ou serviço externo.

## Critérios de aceite

- Parser aceita v1 com ou sem endereço e rejeita tipo/versão/IDs inconsistentes,
  payload incompleto ou campos não aprovados.
- Integração confirma correlação e ausência de códigos da UC/distribuidora.
- Falha de inserção reverte UC e auditoria na mesma transação.
- `pnpm check`, `pnpm test:integration` e `git diff --check`.
- Rollback retira produtor sem excluir linhas ou estrutura da outbox.

## Evidência e limites

O fato já existia como `commercial.utility_unit_created`; o novo registro durável
não altera o fluxo manual de cadastro ou as regras de domínio. Consumidor,
transporte, inbox, retry operacional, retenção final, replay e reconciliação
continuam pendentes em R1.

Validações locais: `@moura-solar/contracts` (6 arquivos de teste), integração de
CRM (11/11), `pnpm check` (format/lint/types/tests/build), links locais e
`git diff --check` passaram. A integração usou PostgreSQL Compose e limpou apenas
o schema efêmero; o container foi parado sem remover o volume. CI remota está
pendente no PR deste incremento.

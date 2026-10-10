# R1-56 — Campos textuais obrigatórios do envelope

**Data:** 10/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Implementado na branch `codex/r1-56-envelope-required-fields`.

**SPECs:** [SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Dependências:** R1-53 a R1-55 protegem metadados das declarações v1; este
incremento cobre o parser runtime do envelope compartilhado.

## Protocolo do incremento

- **Antes:** o parser já verificava campos textuais obrigatórios, mas a suíte
  exercitava apenas a correlação ausente e alguns valores inválidos.
- **Depois:** um teste table-driven exige que `eventId`, `eventType`,
  `occurredAt`, `organizationId`, `aggregateId`, `producer` e `correlationId`
  rejeitem tanto ausência quanto string em branco.
- **Contratos:** nenhuma declaração, parser de runtime ou payload foi alterado.
- **Migração compatível:** nenhuma; sem alteração de schema, dependências,
  configuração ou dados.
- **Aceite:** todos os campos textuais obrigatórios do envelope compartilhado
  têm casos negativos para ausência e branco; o envelope válido continua aceito.
- **Rollback:** remover o teste e este relatório; sem efeito persistido ou
  serviço a reverter.

## Validação

- `node --test packages/contracts/tests/integration-event.test.mjs` — passou.
- `pnpm --filter @moura-solar/contracts test` — build TypeScript e 11/11 arquivos
  de teste passaram.
- CI completa, migrations, integração e E2E — pendentes.

## Limites

O incremento protege validação já existente sem modificar seu comportamento. Não
ativa transporte, worker, broker ou consumidor. A importação de contas continua
manual conforme ADR-008.

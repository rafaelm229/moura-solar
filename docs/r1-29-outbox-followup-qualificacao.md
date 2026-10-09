# R1-29 — Outbox para atividade de follow-up da qualificação

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Em implementação na branch
`codex/r1-29-qualification-followup-event`.

**SPECs:** [SPEC-001](../specs/SPEC-001-jornada-cliente/spec.md),
[SPEC-004](../specs/SPEC-004-clientes-oportunidades/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-029](adr/ADR-029-outbox-followup-qualificacao.md).

**Dependências:** R1-16, R1-24 e R1-28 consolidados; qualificação versionada,
auditoria e criação opcional de follow-up já existem.

## Antes/depois

- **Antes:** qualificação atualizava estado, criava opcionalmente follow-up,
  gravava transição/auditoria e emitia `OPPORTUNITY_QUALIFIED`.
- **Depois:** quando o follow-up é criado, emite também `ACTIVITY_CREATED` v1 na
  mesma transação.
- **Semântica:** não altera gates, autorização, transição, versão ou resposta.
  Reutiliza a auditoria da qualificação como evidência do comando transacional.
- **Payload:** `activityId`, `auditEventId`, `customerId` e `opportunityId`; sem
  assunto, descrição, tipo, responsável ou vencimento.
- **Correlação/deduplicação:** `requestId`; dedupe inclui IDs da auditoria e da
  atividade.
- **Migração:** nenhuma; usa `IntegrationOutbox` e `AuditEvent` existentes.
- **Ativação:** sem publicação ou consumidor.
- **Sem follow-up:** nenhuma atividade/evento filho é criado se o comando não
  incluir `nextActivity`.

## Execução e evidências locais

- `pnpm --filter @moura-solar/contracts test`: 57/57 passaram.
- `pnpm --filter @moura-solar/api build`: passou.
- `node --test --test-concurrency=1 tests/commercial.integration.mjs`: 20/20
  passaram no PostgreSQL/MinIO/ClamAV local; inclui follow-up, ausência de filho
  sem novo follow-up e rollback integral.
- CI de branch ainda pendente; por isso o estado continua Em implementação.

## Critérios de aceite

- Reutilizar contrato `ACTIVITY_CREATED` v1 e rejeitar payload operacional.
- Integração comprova auditoria compartilhada, correlação, evento pai/filho,
  ausência de evento filho sem follow-up, `publishedAt` nulo e rollback integral
  quando a inserção do filho falha.
- `pnpm check`, integração comercial PostgreSQL/MinIO, CI completa, links locais,
  Prettier e `git diff --check`.
- Rollback remove só o produtor filho, preservando qualificação e evento pai.

## Limites

R1-29 não publica eventos nem ativa consumidor. Importação de contas permanece
manual; OCR, worker e serviços externos seguem fora do escopo.

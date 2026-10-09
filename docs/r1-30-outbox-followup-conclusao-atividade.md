# R1-30 — Outbox para follow-up da conclusão de atividade

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Em implementação na branch
`codex/r1-30-completion-followup-event`.

**SPECs:** [SPEC-001](../specs/SPEC-001-jornada-cliente/spec.md),
[SPEC-004](../specs/SPEC-004-clientes-oportunidades/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-030](adr/ADR-030-outbox-followup-conclusao-atividade.md).

**Dependências:** R1-24 e R1-26 consolidados; R1-29 já emite o mesmo fato para
follow-up criado ao qualificar oportunidade. Conclusão, auditoria e criação
opcional do follow-up já ocorrem na transação local.

## Antes/depois

- **Antes:** conclusão com follow-up emitia `ACTIVITY_COMPLETED`, incluindo
  `nextActivityId`, mas não emitia o evento de criação da atividade filha.
- **Depois:** a atividade filha também gera `ACTIVITY_CREATED` v1 na mesma
  transação local.
- **Semântica:** não muda gates, autorização, conclusão, versão, resultado ou
  resposta HTTP.
- **Payload:** `activityId`, `auditEventId` e `customerId`/`opportunityId` quando
  presentes; não inclui assunto, descrição, tipo, responsável ou vencimento.
- **Correlação/deduplicação:** `requestId`; dedupe inclui IDs da auditoria e da
  atividade filha.
- **Migração:** nenhuma; usa `IntegrationOutbox` e `AuditEvent` existentes.
- **Sem follow-up:** não cria evento adicional `ACTIVITY_CREATED`.
- **Ativação:** sem publicação ou consumidor.

## Execução e evidências locais

- `pnpm --filter @moura-solar/api build`: passou.
- `node --test --test-concurrency=1 tests/commercial.integration.mjs`: 21/21
  passaram no PostgreSQL/MinIO/ClamAV local, incluindo rollback do evento filho
  e conclusão sem follow-up.
- `pnpm check`: passou fora do sandbox. A primeira execução no sandbox bloqueou
  `spawnSync unzip` nos testes DOCX preexistentes (`EPERM`); repetição autorizada
  passou com os diretórios não rastreados do usuário excluídos temporariamente.
- CI do branch ainda pendente; o estado permanece Em implementação.

## Critérios de aceite

- Reutilizar `ACTIVITY_CREATED` v1 com payload mínimo e auditoria compartilhada.
- Integração comprova os eventos pai/filho, correlação, `publishedAt` nulo e
  ausência do evento adicional sem follow-up.
- Falha ao gravar `ACTIVITY_CREATED` reverte conclusão, atividade filha,
  auditoria e `ACTIVITY_COMPLETED`.
- `pnpm check`, integração comercial PostgreSQL/MinIO, CI, links locais,
  Prettier e `git diff --check`.
- Rollback remove apenas o produtor filho, preservando a conclusão e o evento
  pai.

## Limites

R1-30 não publica eventos nem ativa consumidor. Importação de contas permanece
manual; OCR, worker e serviços externos seguem fora do escopo.

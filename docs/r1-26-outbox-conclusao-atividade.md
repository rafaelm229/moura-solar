# R1-26 — Contrato e outbox local para conclusão de atividade

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Em implementação na branch `codex/r1-26-activity-completed`.

**SPECs:** [SPEC-001](../specs/SPEC-001-jornada-cliente/spec.md),
[SPEC-004](../specs/SPEC-004-clientes-oportunidades/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-026](adr/ADR-026-outbox-conclusao-atividade.md).

**Dependências:** R1-25 consolidado; conclusão versionada, auditoria e criação
opcional da próxima atividade já ocorrem na transação local.

## Antes/depois

- **Antes:** o comando validava e concluía a atividade, criava opcionalmente um
  follow-up e gravava auditoria, mas não registrava evento de integração.
- **Depois:** `ACTIVITY_COMPLETED` v1 será persistido junto ao comando e à auditoria.
- **Semântica:** conclusão aceita; não muda autorização, status, versão, resultado
  registrado nem resposta HTTP.
- **Payload:** `activityId`, `auditEventId`, vínculos presentes `customerId` /
  `opportunityId` e `nextActivityId` quando houver follow-up. Sem resultCode,
  observações, texto ou campos de agenda.
- **Correlação/deduplicação:** `requestId` e ID imutável da auditoria.
- **Migração:** nenhuma; usa `IntegrationOutbox` e `AuditEvent` existentes.
- **Ativação:** sem publicação ou consumidor.

## Execução e evidências locais

- `pnpm --filter @moura-solar/contracts test`: passou; inclui os casos v1 de
  aceitação e rejeição de payload de conclusão.
- `pnpm --filter @moura-solar/api build`: passou.
- `node --test --test-concurrency=1 tests/commercial.integration.mjs`: 18/18
  passaram, incluindo rollback da conclusão, auditoria e follow-up.
- `pnpm check`: passou; API 1.257/1.257 testes, 10 tarefas do workspace e builds
  concluídos sem falhas.
- `git diff --check` e verificação de links locais: passaram.
- CI de branch ainda pendente; por isso o estado continua Em implementação.

## Critérios de aceite

- Contrato v1 valida tipo/versão, IDs, agregado, vínculos opcionais e rejeita
  resultado ou qualquer campo extra.
- Integração comprova 401 sem sessão, 409 por versão obsoleta, correlação,
  auditoria, vínculo do follow-up e `publishedAt` nulo.
- Falha forçada da outbox reverte conclusão, versão, auditoria e follow-up.
- `pnpm check`, integração comercial PostgreSQL/MinIO, CI completa, links locais,
  Prettier e `git diff --check`.
- Rollback remove só o produtor/contrato, preservando atividades e histórico.

## Limites

R1-26 não publica eventos nem ativa consumidor. Importação de contas permanece
manual; OCR, worker e serviços externos seguem fora do escopo.

# R1-27 — Contrato e outbox local para reagendamento de atividade

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Em implementação na branch `codex/r1-27-activity-rescheduled`.

**SPECs:** [SPEC-001](../specs/SPEC-001-jornada-cliente/spec.md),
[SPEC-004](../specs/SPEC-004-clientes-oportunidades/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-027](adr/ADR-027-outbox-reagendamento-atividade.md).

**Dependências:** R1-26 consolidado; reagendamento versionado e auditoria local
já existem.

## Antes/depois

- **Antes:** o comando reagenda atividade aberta, acrescenta notas opcionais,
  incrementa versão e registra auditoria, sem evento de integração.
- **Depois:** `ACTIVITY_RESCHEDULED` v1 será persistido junto ao comando e à
  auditoria.
- **Semântica:** não muda autorização, estado, versão, data/notas registradas nem
  resposta HTTP.
- **Payload:** `activityId`, `auditEventId` e vínculos presentes `customerId` /
  `opportunityId`; sem vencimento, notas ou texto da atividade.
- **Correlação/deduplicação:** `requestId` e ID imutável da auditoria.
- **Migração:** nenhuma; usa `IntegrationOutbox` e `AuditEvent` existentes.
- **Ativação:** sem publicação ou consumidor.

## Execução e evidências locais

- `pnpm --filter @moura-solar/contracts test`: passou, incluindo validação de
  `ACTIVITY_RESCHEDULED` v1.
- `pnpm --filter @moura-solar/api build`: passou.
- `node --test --test-concurrency=1 tests/commercial.integration.mjs`: 19/19
  passaram no PostgreSQL/MinIO/ClamAV local, incluindo rollback e conflito.
- `pnpm check`: passou; API 1.257/1.257 testes, 10 tarefas do workspace e builds
  concluídos sem falhas.
- `git diff --check`, Prettier e verificação de links locais: passaram.
- CI de branch ainda pendente; por isso o estado continua Em implementação.

## Critérios de aceite

- Contrato v1 valida tipo/versão, IDs, agregado e vínculos opcionais; rejeita
  vencimento, notas e qualquer campo extra.
- Integração comprova 401 sem sessão, 409 por versão obsoleta, vínculo,
  correlação, auditoria e `publishedAt` nulo.
- Falha forçada da outbox reverte data, versão e auditoria.
- `pnpm check`, integração comercial PostgreSQL/MinIO, CI completa, links locais,
  Prettier e `git diff --check`.
- Rollback remove só o produtor/contrato, preservando atividades e histórico.

## Limites

R1-27 não publica eventos nem ativa consumidor. Importação de contas permanece
manual; OCR, worker e serviços externos seguem fora do escopo.

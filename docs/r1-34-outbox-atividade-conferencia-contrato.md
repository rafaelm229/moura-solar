# R1-34 — Outbox para atividade da conferência de contrato

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no branch `feat/proposal-visual-clarity` pelo PR #75,
merge `431a8a4d7ba79b4bfdd9e117f84bceafa04b519e`. Não representa liberação em
`main` nem ativação de consumidor.

**Commit de implementação:** `2a6332667e4b5544cb67402b614f1fabb74b4d95`.

**SPECs:** [SPEC-007](../specs/SPEC-007-contratos-documentos/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-034](adr/ADR-034-outbox-atividade-conferencia-contrato.md).

**Dependências:** R1-09, R1-24 e R1-33; a conferência humana já cria atividade
e auditoria em uma transação local.

## Diferenças antes/depois

- **Antes:** a decisão de conferência aprovada cria uma atividade de início da
  engenharia; a rejeição cria uma atividade para regularizar a assinatura. Não
  há evento para essas atividades.
- **Depois (escopo autorizado):** cada ramo grava `ACTIVITY_CREATED` v1 na
  mesma transação que a revisão, a atividade e a auditoria existentes.
- **Contrato:** agregado `Activity`; payload mínimo `activityId`,
  `auditEventId`, `customerId` e `opportunityId`; `correlationId` vem do
  `requestId`; dedupe é `ACTIVITY_CREATED:<auditEventId>:<activityId>`.
- **Semântica:** mantém a decisão humana, checklist, estados, gates, transições,
  atividade, resposta e efeitos financeiros atuais.
- **Migração:** nenhuma. Reutiliza `IntegrationOutbox` e `AuditEvent`.
- **Ativação:** sem publicação ou consumidor.

## Critérios de aceite

- Aprovação e rejeição persistem um evento associado à auditoria e atividade do
  respectivo ramo, com correlação comum, dedupe e payload mínimo.
- Falha injetada na gravação do evento reverte a revisão, estado, gate,
  transição, atividade e auditoria da transação.
- Preservar permissões, regras da conferência e formatos de resposta.
- Validar integração PostgreSQL, `pnpm check`, Prettier, links e
  `git diff --check`; registrar limitações de CI sem alegar sucesso não obtido.

## Evidências

- `pnpm --filter @moura-solar/api build`: passou.
- `node --test --test-concurrency=1 tests/contract.integration.mjs`: 7/7
  passaram com PostgreSQL, MinIO e ClamAV locais; cobre aprovação, rejeição,
  correlação e rollback por falha forçada na outbox.
- `pnpm check`: passou, com `.prettierignore` restaurado após excluir
  temporariamente as pastas não rastreadas `.vscode/` e
  `moura-solar-specs-roadmap/` da varredura de Prettier.
- Prettier dos arquivos afetados, links locais e `git diff --check`: passaram.
- CI #131 do PR #75 passou em `pnpm check`, geração do cliente, diff do cliente,
  migrations, integração, E2E e limpeza dos containers.
- Consolidação: PR #75 em `feat/proposal-visual-clarity`, merge
  `431a8a4d7ba79b4bfdd9e117f84bceafa04b519e`.

## Rollback

Remover apenas a gravação do evento filho e seus testes. Nenhuma migration ou
evento pai precisa de reversão; manter a conferência humana e as atividades
existentes.

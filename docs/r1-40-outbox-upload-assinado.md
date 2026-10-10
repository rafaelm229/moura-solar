# R1-40 — Outbox para upload manual do contrato assinado

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Validado localmente na branch `codex/r1-40-contract-signed-upload-event`;
CI e consolidação pendentes.

**SPECs:** [SPEC-007](../specs/SPEC-007-contratos-documentos/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-040](adr/ADR-040-evento-upload-manual-assinado.md).

**Dependências:** R1-24, R1-34 e R1-39 consolidados; upload manual,
`ACTIVITY_CREATED` e auditoria existentes.

## Diferenças antes/depois

- **Antes:** o arquivo era enviado ao armazenamento externo; em transação local
  eram criados documento, estado `SIGNED_UPLOADED`, atividade de conferência e
  auditoria, sem evento próprio do upload ou da atividade.
- **Depois (R1-40):** a mesma transação local grava `CONTRACT_SIGNED_UPLOADED` v1
  e `ACTIVITY_CREATED` v1.
- **Contratos:** fato de upload usa agregado `Contract` e payload com
  `contractId`, `documentId`, `contractVersionId`, `auditEventId` e
  `opportunityId`; atividade usa apenas IDs do contrato de eventos existente.
- **Privacidade:** nome, bytes, tamanho, hash e observações não entram nos eventos.
- **Limite funcional:** operação de upload e conferência continuam manuais. Não
  há leitura de arquivo, decisão jurídica automática, gate, dispatcher ou
  consumidor novo. Sem migration/OpenAPI.
- **Fronteira:** armazenamento externo é gravado antes da transação PostgreSQL;
  falha local pode deixar objeto órfão. R1-40 não adiciona compensação.

## Critérios de aceite

- Upload autorizado grava documento, estado, auditoria e dois eventos com
  correlação e payload mínimo.
- O contrato permanece `SIGNED_UPLOADED`; o gate não avança.
- Guard rejeita tipo/versão inválidos, agregado divergente e metadados extras.
- O fluxo não analisa o documento nem decide a validade da assinatura.

## Evidências

- `pnpm --filter @moura-solar/contracts test`: passou (9 suítes de contrato).
- `pnpm --filter @moura-solar/api build`: passou.
- `node --test --test-concurrency=1 tests/contract.integration.mjs`: passou
  (9 cenários; upload, atividade, correlação e gate não liberado).
- `pnpm check`: passou (format, lint, typecheck, testes e build).
- CI e consolidação: pendentes.

## Rollback

Remover somente os contratos e emissões de `CONTRACT_SIGNED_UPLOADED` e do novo
`ACTIVITY_CREATED`. Preservar upload manual, atividade, auditoria, estado,
autorização e gate.

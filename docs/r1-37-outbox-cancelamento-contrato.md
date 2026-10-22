# R1-37 — Outbox para cancelamento de contrato

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #81, merge `7ff3b85`; CI #137 completa verde.

**SPECs:** [SPEC-007](../specs/SPEC-007-contratos-documentos/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-037](adr/ADR-037-evento-cancelamento-contrato.md).

**Dependências:** R1-08 contratos versionados e R1-36 evento de contrato
consolidados; cancelamento e auditoria já existentes.

## Diferenças antes/depois

- **Antes:** a rota autorizada mudava estado e registrava auditoria na transação,
  sem fato de integração.
- **Depois (escopo R1-37):** grava `CONTRACT_CANCELED` v1 na mesma transação.
- **Contrato:** agregado `Contract`; produtor `contracts`; payload com
  `contractId`, `auditEventId` e `opportunityId`; correlação pelo request ID;
  deduplicação pelo ID da auditoria.
- **Privacidade:** motivo, observações e texto contratual não são copiados para a
  outbox.
- **Compatibilidade:** a rota, a permissão, os estados e a resposta permanecem;
  a rejeição de repetição também permanece. Nenhuma alteração de OpenAPI ou
  migration.
- **Ativação:** evento não publicado, sem worker, consumidor, envio externo ou
  efeito financeiro.

## Critérios de aceite

- O cancelamento autorizado grava estado, auditoria e evento com correlação e
  payload mínimo.
- Falha forçada no insert da outbox reverte o estado, as notas e a auditoria.
- Uma segunda tentativa após cancelamento é rejeitada e não duplica o evento.
- O guard do pacote rejeita tipo/versão desconhecidos, ID divergente e campos
  extras.
- O incremento preserva `contracts:cancel` e todos os demais gates existentes.

## Evidências

- `pnpm --filter @moura-solar/contracts test`: 9/9 arquivos passaram, incluindo
  validação e rejeição de payloads de contrato.
- `node --test --test-concurrency=1 tests/contract.integration.mjs`: 8/8; o novo
  caso verificou persistência/correlação, rollback PostgreSQL e repetição
  rejeitada sem evento duplicado.
- `pnpm check`: concluído com sucesso (formatação, lint, typecheck, testes e
  builds). A execução precisou de permissão local para o subprocesso `unzip`
  exigido pelos testes DOCX; nenhuma expectativa foi alterada.
- `pnpm api:generate`: sucesso, sem diferença em `packages/api-client`.
- Prettier, links locais afetados e `git diff --check`: sem erros.
- CI #137 passou por `pnpm check`, geração, migrations, integração e E2E.
- Consolidado na branch `feat/proposal-visual-clarity`; não liberado em `main`.

## Rollback

Remover apenas a emissão e o contrato de `CONTRACT_CANCELED` v1. Manter
cancelamento, autorização, auditoria e transições existentes.

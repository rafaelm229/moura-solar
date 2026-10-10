# R1-38 — Outbox para registro manual de aditivo de contrato

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Validado localmente na branch `codex/r1-38-contract-amendment-event`;
`pnpm check` e integração PostgreSQL passaram. CI e consolidação pendentes.

**SPECs:** [SPEC-007](../specs/SPEC-007-contratos-documentos/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-038](adr/ADR-038-evento-registro-manual-aditivo-contrato.md).

**Dependências:** R1-08, R1-36 e R1-37 consolidados; comando atual de aditivo e
auditoria existentes.

## Diferenças antes/depois

- **Antes:** o comando atualiza estado/notas e registra auditoria na transação,
  sem evento de integração.
- **Depois (R1-38):** grava `CONTRACT_AMENDMENT_RECORDED` v1 na mesma transação.
- **Contrato:** agregado `Contract`; produtor `contracts`; payload com
  `contractId`, `auditEventId` e `opportunityId`; correlação pelo request ID;
  deduplicação pelo ID da auditoria.
- **Privacidade:** motivo, notas, alterações estruturadas e texto do contrato
  não entram no payload.
- **Limite funcional:** o evento acompanha apenas o comando atual; não significa
  que versão-base, documento próprio, alterações estruturadas ou aprovações do
  aditivo já existam.
- **Compatibilidade:** rota, permissão, regra de estado, notas, resposta,
  migration e OpenAPI permanecem.
- **Ativação:** sem publicação, worker, consumidor ou efeito externo.

## Critérios de aceite

- Registro autorizado grava estado, auditoria e evento com correlação e payload
  mínimo.
- Falha forçada no insert da outbox reverte estado, notas e auditoria.
- Guard rejeita tipo/versão desconhecidos, ID divergente e campos extras.
- Permissão `contracts:create_amendment` e gates existentes permanecem.

## Evidências

- `pnpm --filter @moura-solar/contracts test`: passou (9 testes).
- `pnpm --filter @moura-solar/api build`: passou.
- `node --test --test-concurrency=1 tests/contract.integration.mjs`: passou
  (9 cenários, incluindo rollback atômico).
- `pnpm check`: passou (format, lint, typecheck, testes e build).
- CI e consolidação: pendentes.

## Rollback

Remover apenas o contrato e a emissão de `CONTRACT_AMENDMENT_RECORDED` v1.
Preservar o comando manual, autorização, estado, notas e auditoria existentes.

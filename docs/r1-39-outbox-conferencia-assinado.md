# R1-39 — Outbox para decisão manual da conferência do assinado

**Data:** 10/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Validado localmente na branch `codex/r1-39-contract-signed-review-event`;
CI e consolidação pendentes.

**SPECs:** [SPEC-007](../specs/SPEC-007-contratos-documentos/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-039](adr/ADR-039-evento-conferencia-assinado.md).

**Dependências:** R1-34, R1-37 e R1-38 consolidados; comando humano de conferência,
auditoria e evento da atividade já existentes.

## Diferenças antes/depois

- **Antes:** o comando autorizado registrava revisão e auditoria, atualizava
  estado/gates/transição quando aprovado e criava atividade; a outbox recebia
  somente o evento da atividade.
- **Depois (R1-39):** registra também `CONTRACT_SIGNED_REVIEWED` v1 na mesma
  transação local.
- **Contrato:** agregado `Contract`; produtor `contracts`; payload com
  `contractId`, `reviewId`, `auditEventId`, `opportunityId` e decisão
  `VERIFIED`/`REJECTED`; request ID correlaciona e auditoria/revisão deduplicam.
- **Privacidade:** checklist, observação, motivo de rejeição e dados do documento
  ficam fora do evento.
- **Limite funcional:** não muda decisão humana, checklist, permissões, gates,
  atividade existente ou plano financeiro posterior best-effort. Nenhum
  consumidor/dispatcher, migration ou contrato OpenAPI.

## Critérios de aceite

- Aprovação humana persiste revisão, auditoria, atividade e evento com payload
  mínimo/correlação.
- Rejeição humana persiste decisão e evento sem motivo/checklist.
- Falha forçada no insert do evento reverte todos os efeitos da transação local.
- Guard rejeita tipo/versão/decisão inválidos, contrato divergente e campos extras.

## Evidências

- `pnpm --filter @moura-solar/contracts test`: passou (9 suítes de contrato).
- `pnpm --filter @moura-solar/api build`: passou.
- `node --test --test-concurrency=1 tests/contract.integration.mjs`: passou
  (9 cenários; aprovado, rejeitado e rollback atômico).
- `pnpm check`: passou (format, lint, typecheck, testes e build).
- CI e consolidação: pendentes.

## Rollback

Remover apenas contrato e emissão de `CONTRACT_SIGNED_REVIEWED` v1. Preservar o
processo manual atual, autorização, revisão, auditoria, gates, atividade e efeitos
existentes.

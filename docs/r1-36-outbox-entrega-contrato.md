# R1-36 — Outbox para registro manual de entrega de contrato

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #79, merge `0a246e8`; CI #135 completa verde.

**SPECs:** [SPEC-007](../specs/SPEC-007-contratos-documentos/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-036](adr/ADR-036-evento-registro-manual-entrega-contrato.md).

**Dependências:** R1-33 e R1-35 consolidados; o registro manual de entrega e a
atividade de acompanhamento já existem.

## Diferenças antes/depois

- **Antes:** o comando registra entrega, estado, follow-up, auditoria e evento
  `ACTIVITY_CREATED`, mas não emite fato do domínio de contrato.
- **Depois (escopo autorizado):** grava também `CONTRACT_DELIVERED` v1 na mesma
  transação local.
- **Contrato:** agregado `Contract`; payload apenas `contractId`, `deliveryId`,
  `auditEventId`, `opportunityId`; correlação por `requestId`; dedupe por
  auditoria e entrega.
- **Limites:** é o registro manual da entrega; não envia documento nem chama
  canal. Canal, destinatário, notas e conteúdo do contrato não entram no evento.
- **Migração:** nenhuma. Reutiliza a outbox e auditoria existentes.
- **Ativação:** sem publicação ou consumidor.

## Critérios de aceite

- A entrega bem-sucedida persiste evento, auditoria e IDs corretos, com
  correlação, dedupe e payload mínimo.
- Falha forçada ao persistir `CONTRACT_DELIVERED` reverte a entrega, estado,
  atividade, auditoria e evento da atividade na mesma transação.
- Preservar gates de pagamento, autorização, resposta e follow-up existentes.
- Validar integração PostgreSQL, `pnpm check`, Prettier, links e
  `git diff --check`; não alegar CI verde sem resultado observado.

## Evidências

- `pnpm --filter @moura-solar/contracts test`: 62/62; build da API concluído.
- `node --test --test-concurrency=1 tests/contract.integration.mjs`: 7/7,
  incluindo rollback no PostgreSQL local quando `CONTRACT_DELIVERED` falha e
  persistência/correlação no registro manual bem-sucedido.
- `pnpm check`: exit code 0 (formatação, lint, typecheck, testes e build).
- CI #135: `pnpm check`, geração da API, migrations, integração completa e E2E
  passaram.
- Links locais, Prettier e `git diff --check`: sem erros.
- Consolidado na branch `feat/proposal-visual-clarity`; não liberado em `main`.

## Rollback

Remover somente a gravação do evento de contrato, contrato e teste novos. Manter
inalterados entrega manual, regra de pagamento, auditoria e atividade existentes.

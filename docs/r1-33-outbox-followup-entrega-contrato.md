# R1-33 — Outbox para follow-up de entrega de contrato

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no branch `feat/proposal-visual-clarity` pelo PR #73,
merge `33f7213a822e0687a5c8f138022897a65fece081`. Não representa liberação em
`main` nem ativação de consumidor.

**SPECs:** [SPEC-007](../specs/SPEC-007-contratos-documentos/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-033](adr/ADR-033-outbox-followup-entrega-contrato.md).

**Dependências:** R1-24 e R1-32 consolidados; a entrega de contrato já cria o
follow-up e registra `CONTRACT_DELIVERED` na transação local.

## Antes/depois

- **Antes:** enviar o contrato para assinatura atualizava o contrato e criava
  follow-up, sem evento próprio para a atividade.
- **Depois:** emite `ACTIVITY_CREATED` v1 na mesma transação, compartilhando a
  auditoria `CONTRACT_DELIVERED`.
- **Semântica:** preserva canal, destinatário, notas, gates, estado e resposta.
- **Payload:** `activityId`, `auditEventId`, `customerId` e `opportunityId`; sem
  assunto, descrição, tipo, responsável ou vencimento.
- **Correlação/deduplicação:** `requestId`; dedupe inclui IDs da auditoria e da
  atividade.
- **Migração:** nenhuma; usa `IntegrationOutbox` e `AuditEvent` existentes.
- **Ativação:** sem publicação ou consumidor.

## Critérios de aceite

- Emitir o evento filho para o follow-up criado pela entrega.
- Confirmar evento vinculado à auditoria e atividade, correlação comum e dedupe
  `ACTIVITY_CREATED:<auditEventId>:<activityId>`.
- Injetar falha na gravação do evento filho e confirmar rollback de entrega,
  estado do contrato, follow-up e auditoria.
- Preservar a resposta `201`, validação de pagamento e demais regras atuais.
- Validar integração PostgreSQL, `pnpm check`, Prettier, links e
  `git diff --check`; registrar falhas externas sem alegar CI verde.

## Execução e evidências

- `pnpm --filter @moura-solar/api build`: passou.
- `node --test --test-concurrency=1 tests/contract.integration.mjs`: 7/7
  passaram no PostgreSQL/MinIO/ClamAV local, incluindo rollback da entrega.
- `pnpm check`: passou fora do sandbox; cobre formatação, lint, typecheck, testes
  e build.
- Prettier, links locais e `git diff --check`: passaram.
- CI #129 falhou em `Initialize containers`, antes do checkout e dos testes: o
  runner expirou ao baixar `postgres:17-alpine` do Docker Hub. Resultado de CI:
  **não validado**.
- Consolidação: PR #73 em `feat/proposal-visual-clarity`, merge
  `33f7213a822e0687a5c8f138022897a65fece081`.

## Rollback

Remover apenas a gravação do evento filho e seus testes. Nenhuma migration ou
evento pai precisa de reversão; manter o comportamento existente de entrega.

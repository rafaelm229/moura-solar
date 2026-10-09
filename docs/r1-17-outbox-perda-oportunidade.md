# R1-17 — Contrato e outbox local para perda de oportunidade

**Data:** 09/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #43, merge commit `60a73ec`; CI completa verde.

**SPECs:** [SPEC-001](../specs/SPEC-001-jornada-cliente/spec.md),
[SPEC-004](../specs/SPEC-004-clientes-oportunidades/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Decisão:** [ADR-017](adr/ADR-017-outbox-perda-oportunidade.md).

**Dependências:** R1-10–16 consolidados; `CommercialService.loseOpportunity`
altera estado/versão, cancela atividades abertas, cria `OpportunityTransition`
e registra auditoria em transação Serializable local.

## Antes/depois

- **Antes:** o comando de perda grava a transição a `PERDIDO`, o motivo e as
  observações no domínio, cancela atividades e audita; não há evento durável.
- **Depois:** `OPPORTUNITY_LOST` v1 é gravado na mesma transação local dos efeitos
  acima.
- **Semântica:** representa a transição existente para `PERDIDO`, respeitando
  validação do motivo, versão esperada e estados terminais atuais.
- **Payload:** oportunidade, transição, estado de origem e destino; sem motivo,
  observações, justificativa nem texto de atividade.
- **Correlação/deduplicação:** `requestId` do comando e ID de
  `OpportunityTransition`.
- **Migração:** nenhuma; usa `IntegrationOutbox` existente.
- **Ativação:** evento não publicado; sem dispatcher, consumidor, broker ou
  integração externa.

## Critérios de aceite

- Contrato v1 valida IDs, agregado, `fromState` não vazio, `toState=PERDIDO` e
  rejeita campos extras.
- Integração confirma correlação, vínculo à transição e `publishedAt` nulo.
- Falha forçada da outbox reverte estado/versão, transição, cancelamentos de
  atividade e auditoria.
- Repetir o comando com versão obsoleta continua em conflito e não duplica o
  evento.
- `pnpm check`, contrato, integração comercial, CI completa, links locais e
  `git diff --check`.
- Rollback remove somente o produtor/contrato novos; preserva histórico e
  estrutura da outbox.

## Evidência e limites

Os testes de `@moura-solar/contracts` passaram (36/36); build da API passou;
`tests/commercial.integration.mjs` passou 11/11 com PostgreSQL/MinIO locais,
incluindo rollback total da transação. `pnpm check` passou em formatação, lint,
typecheck, 1.257 testes e build; Prettier, links locais e `git diff --check`
passaram. CI completa passou antes da consolidação. Nenhuma migration. R1
continua em andamento. Não altera regras de perda/reabertura nem a importação
manual de contas definida pela ADR-008.

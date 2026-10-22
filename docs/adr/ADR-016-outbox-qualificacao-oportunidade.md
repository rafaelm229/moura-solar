# ADR-016 — Outbox local para qualificação de oportunidade

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-16; publicação e consumidor permanecem fora
do incremento.

**Escopo:** R1, SPEC-001, SPEC-004, SPEC-016 e SPEC-019

## Contexto

`CommercialService.qualifyOpportunity` valida a versão esperada, os gates de
contato/atividade e o estado `NOVO`; na mesma transação altera o estado, registra
uma linha imutável em `OpportunityTransition`, pode criar atividade e grava
auditoria. Outros domínios ainda não têm contrato para esse fato.

## Decisão

- Persistir `OPPORTUNITY_QUALIFIED` v1 na `IntegrationOutbox` dentro da transação
  existente da qualificação.
- Descrever apenas a transição `NOVO` → `QUALIFICADO` já aceita pela API; não
  alterar gates, permissões, alçadas nem retorno HTTP.
- Usar oportunidade como agregado, instante da linha de transição e `requestId`
  como correlação.
- Payload contém `opportunityId`, `transitionId`, `customerId`, `fromState` e
  `toState`. Não contém resumo de necessidade, consumo, atividade, justificativa
  ou dados pessoais.
- Deduplicar pelo identificador imutável da transição
  (`OPPORTUNITY_QUALIFIED:<transitionId>`).
- Manter evento não publicado e sem dispatcher, consumidor, broker ou chamada
  externa.

## Consequências e controles

- Nenhuma migration: R1-16 reutiliza `IntegrationOutbox`.
- Falha ao inserir o evento reverte todas as gravações da transação: estado e
  versão, transição, atividade opcional e auditoria.
- Repetir o comando com `expectedVersion` obsoleto continua em conflito; a
  transição registrada é a unidade idempotente do fato.
- Um consumidor futuro exige contrato, inbox/idempotência, política operacional
  e evidência próprios.
- Importação de contas permanece manual pela ADR-008.

## Evidência necessária para R1-16

Teste do contrato versionado e integração do fluxo real com correlação,
identificador de transição, payload mínimo, `publishedAt` nulo e rollback
forçado; `pnpm check`, CI completa, links locais e `git diff --check`.

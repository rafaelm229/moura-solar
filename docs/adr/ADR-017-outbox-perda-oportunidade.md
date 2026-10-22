# ADR-017 — Outbox local para perda de oportunidade

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-17; publicação e consumidor permanecem fora
do incremento.

**Escopo:** R1, SPEC-001, SPEC-004, SPEC-016 e SPEC-019

## Contexto

`CommercialService.loseOpportunity` valida a versão esperada e o motivo,
transiciona uma oportunidade ativa para `PERDIDO`, cancela atividades abertas,
persiste uma linha de `OpportunityTransition` e registra auditoria em uma
transação local. A linha de transição tem ID próprio e imutável.

## Decisão

- Persistir `OPPORTUNITY_LOST` v1 na `IntegrationOutbox` na transação existente
  do comando de perda.
- Representar a transição real para `PERDIDO`; não alterar validação de motivo,
  controle de concorrência, autorização ou efeitos atuais.
- Usar oportunidade como agregado, instante da transição e `requestId` como
  correlação.
- Payload contém `opportunityId`, `transitionId`, `fromState` e `toState`; não
  inclui motivo, observações, justificativa ou descrição das atividades
  canceladas.
- Deduplicar pelo ID imutável da transição
  (`OPPORTUNITY_LOST:<transitionId>`).
- Manter evento não publicado, sem dispatcher, consumidor, broker ou chamada
  externa.

## Consequências e controles

- Nenhuma migration: R1-17 reutiliza `IntegrationOutbox`.
- Falha ao inserir evento reverte a perda completa: estado e versão, transição,
  cancelamento de atividades e auditoria.
- Reenvio com versão obsoleta continua sendo rejeitado pelo controle de
  concorrência; cada transição durável determina sua própria chave de dedupe.
- Um consumidor futuro exige contrato, inbox/idempotência, política operacional
  e evidência próprios.
- Importação de contas permanece manual pela ADR-008.

## Evidência necessária para R1-17

Teste do contrato versionado e integração do fluxo real com correlação,
identificador de transição, payload mínimo, `publishedAt` nulo e rollback
forçado; `pnpm check`, CI completa, links locais e `git diff --check`.

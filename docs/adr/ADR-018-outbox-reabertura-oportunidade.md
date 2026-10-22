# ADR-018 — Outbox local para reabertura de oportunidade

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-18; publicação e consumidor permanecem fora
do incremento.

**Escopo:** R1, SPEC-001, SPEC-004, SPEC-016 e SPEC-019

## Contexto

`CommercialService.reopenOpportunity` valida permissão administrativa, versão
esperada, justificativa e estado terminal. Em transação local, retorna a
oportunidade a `NOVO`, limpa os campos correntes de perda, cria uma
`OpportunityTransition` e registra auditoria. O histórico da transição de perda
continua preservado.

## Decisão

- Persistir `OPPORTUNITY_REOPENED` v1 na `IntegrationOutbox` na mesma transação
  local da reabertura.
- Representar somente as origens `PERDIDO` ou `CANCELADO` e o destino `NOVO`;
  não alterar permissão, justificativa obrigatória, concorrência ou estados
  aceitos pelo comando atual.
- Usar oportunidade como agregado, instante da transição e `requestId` do
  comando como correlação.
- O payload contém `opportunityId`, `transitionId`, `fromState` e `toState`; não
  inclui justificativa nem texto comercial.
- Deduplicar pelo ID imutável da transição
  (`OPPORTUNITY_REOPENED:<transitionId>`).
- Manter o evento não publicado, sem dispatcher, consumidor, broker ou chamada
  externa.

## Consequências e controles

- Nenhuma migration: R1-18 reutiliza `IntegrationOutbox`.
- Falha ao inserir evento reverte estado/versão, limpeza dos campos de perda,
  transição e auditoria.
- Reenvio com versão obsoleta continua rejeitado pelo controle de concorrência;
  cada transição durável determina sua própria chave de dedupe.
- Um consumidor futuro exige contrato, inbox/idempotência, política operacional
  e evidência próprios.
- A importação de contas permanece manual conforme ADR-008; este incremento não
  depende de OCR ou de processamento documental.

## Evidência necessária para R1-18

Teste do contrato versionado e integração do fluxo real com autorização,
correlação, identificador de transição, payload mínimo, `publishedAt` nulo e
rollback forçado; `pnpm check`, CI completa, links locais e `git diff --check`.

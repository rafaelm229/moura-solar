# ADR-039 — Evento da decisão manual de conferência do contrato assinado

**Data:** 10/10/2026

**Status:** Decisão aprovada

**Escopo:** R1-39, SPEC-007, SPEC-016 e SPEC-019

## Contexto

O comando autorizado de conferência cria `SignedContractReview`, atualiza o
estado do contrato e, conforme a decisão, ajusta gates/transição da oportunidade
e cria atividade. A auditoria já diferencia aprovação (`CONTRACT_VERIFIED_GATE_C`)
e rejeição (`CONTRACT_SIGNED_REJECTED`). A outbox atual registra a atividade,
mas não o resultado da conferência.

## Decisão

- Emitir `CONTRACT_SIGNED_REVIEWED` v1 na mesma transação local da revisão,
  auditoria e efeitos operacionais nela já persistidos.
- Usar agregado `Contract`, produtor `contracts`, request ID para correlação e
  auditoria/revisão para deduplicação.
- Payload: `contractId`, `reviewId`, `auditEventId`, `opportunityId` e decisão
  `VERIFIED` ou `REJECTED`.
- Não incluir checklist, observações, motivo de rejeição, documento ou dados
  pessoais.
- A decisão continua exclusivamente humana e sujeita à permissão/gates atuais.
- Não incluir no fato o resultado da criação posterior do plano financeiro, que
  ocorre fora da transação e já é best-effort. Não ativar consumidor, dispatcher,
  publicação ou efeito financeiro.
- Nenhuma migration ou alteração OpenAPI.

## Consequências

Falha ao gravar o evento reverte a conferência e os efeitos locais da mesma
transação. O evento registra somente a decisão confirmada; não executa a decisão
nem substitui o processo manual.

## Protocolo do incremento

- **Antes:** a outbox registrava a atividade criada pela revisão, não o resultado
  da revisão humana.
- **Depois:** atividade e `CONTRACT_SIGNED_REVIEWED` são gravados junto com revisão
  e auditoria.
- **Aceite:** ambos os resultados são persistidos com IDs mínimos; erro no insert
  do fato reverte revisão, atividade, auditoria e transições da transação.
- **Testes:** guard de contrato v1 e integração PostgreSQL para aprovado, rejeitado
  e rollback.
- **Rollback:** remover o contrato/emissão do novo evento; preservar conferência,
  auditoria, atividades, gates e operações existentes.

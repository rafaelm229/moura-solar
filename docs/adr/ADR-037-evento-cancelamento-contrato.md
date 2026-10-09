# ADR-037 — Evento para cancelamento de contrato

**Data:** 09/10/2026

**Status:** Decisão aprovada

**Escopo:** R1-37, SPEC-007, SPEC-016 e SPEC-019

## Contexto

O comando `cancelContract` já altera o estado do contrato e registra a auditoria
`CONTRACT_CANCELED` em uma transação local. O fato ainda não possui contrato
versionado na outbox compartilhada.

## Decisão

- Emitir `CONTRACT_CANCELED` v1 na mesma transação da atualização e da auditoria.
- Usar `Contract` como agregado, `contracts` como produtor, request ID como
  correlação e ID da auditoria como chave de deduplicação.
- Restringir o payload a `contractId`, `auditEventId` e `opportunityId`.
- Não publicar motivo, observações, estado anterior, conteúdo contratual ou dados
  pessoais.
- Preservar a rota, a permissão `contracts:cancel`, os estados permitidos, a
  validação da razão e a resposta existente. A rejeição de cancelamento repetido
  permanece como está.
- Não ativar dispatcher, consumidor, canal externo ou efeito financeiro; nenhuma
  migration é necessária.

## Consequências

O fato de cancelamento torna-se durável e correlacionável com a transação local,
sem afirmar que a comunicação com cliente, compensação ou atualização de gates
já esteja automatizada. Falha ao persistir a outbox reverte estado e auditoria.

## Protocolo do incremento

- **Antes:** cancelamento e auditoria eram atômicos, sem evento de integração.
- **Depois:** também se registra o evento v1 mínimo, atomicamente.
- **Contrato:** agregado `Contract`; payload de IDs; dedupe por auditoria; sem
  `causationId` adicional, pois a auditoria fornece o identificador causal do
  comando; correlação pelo request ID.
- **Aceite:** sucesso cria estado, auditoria e evento; falha forçada da outbox
  deixa estado, notas e contagens sem alteração; repetição rejeitada não cria
  novo evento; payload não contém o motivo.
- **Testes:** guard do contrato em `packages/contracts` e integração PostgreSQL
  com persistência, correlação, payload mínimo, repetição e rollback.
- **Rollback:** remover somente a emissão/evento e seu contrato. Preservar
  cancelamento, autorização, auditoria e regras atuais.

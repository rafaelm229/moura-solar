# ADR-042 — Eventos de revisão e aprovação do contrato

**Data:** 09/10/2026

**Status:** Decisão aprovada para o incremento R1-42

**Escopo:** R1-42, SPEC-007, SPEC-016 e SPEC-019

## Contexto

Os comandos existentes de solicitação de revisão e aprovação alteram o estado
do contrato e podem acrescentar notas privadas, mas não registram auditoria nem
fatos na outbox. Consumidores futuros precisam distinguir as transições sem
receber conteúdo das notas.

## Decisão

- Emitir `CONTRACT_REVIEW_REQUESTED` v1 e `CONTRACT_APPROVED` v1 junto da
  atualização de estado e auditoria, em transação PostgreSQL local.
- Usar agregado `Contract`, produtor `contracts`, request ID como correlação e
  auditoria/contrato nas chaves de deduplicação.
- Payload de ambos os fatos contém somente `contractId`, `auditEventId` e
  `opportunityId`. Notas e outros dados operacionais ficam fora do evento.
- Preservar os estados atuais `PENDING_REVIEW` e `READY`, permissões, observações
  armazenadas, respostas, documentos e comportamento atual dos comandos.
- Nenhuma dessas transições libera o gate contratual, altera financeiro, emite
  atividade, cria migration ou altera OpenAPI.
- Não ativar consumidor/dispatcher nem publicar eventos.

## Protocolo do incremento

- **Antes:** os comandos atualizavam o estado e as notas sem auditoria/outbox.
- **Depois:** estado, auditoria e evento são gravados atomicamente; falha na
  outbox reverte a alteração local.
- **Aceite:** parser restringe tipo/versão/IDs; integração verifica correlação,
  notas privadas fora do payload, gate pendente e rollback ao falhar a outbox.
- **Rollback:** retirar somente auditorias adicionais, tipos, parsers e eventos;
  preservar endpoints, permissões, estados e notas existentes.

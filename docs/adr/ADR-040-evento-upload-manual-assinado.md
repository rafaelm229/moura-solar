# ADR-040 — Eventos para upload manual de contrato assinado

**Data:** 09/10/2026

**Status:** Decisão aprovada

**Escopo:** R1-40, SPEC-007, SPEC-016 e SPEC-019

## Contexto

O comando autenticado de upload valida o PDF, grava o objeto no armazenamento,
e depois, em transação PostgreSQL, cria o registro de documento, move o contrato
para `SIGNED_UPLOADED`, cria atividade de conferência e grava auditoria
`CONTRACT_SIGNED_UPLOADED`. O fluxo não libera o gate automaticamente.

## Decisão

- Emitir `CONTRACT_SIGNED_UPLOADED` v1 e `ACTIVITY_CREATED` na mesma transação
  local dos registros de documento, estado, atividade e auditoria.
- Usar agregado `Contract` no evento de upload, produtor `contracts`, request ID
  como correlação e auditoria/documento para deduplicação.
- Payload do contrato: `contractId`, `documentId`, `contractVersionId`,
  `auditEventId` e `opportunityId`. Payload da atividade: IDs conforme o contrato
  existente `ACTIVITY_CREATED`.
- Não incluir nome/tamanho/hash/bytes do arquivo, observações ou outros metadados.
- Preservar conferência humana, permissão e gates; upload não significa
  autenticidade jurídica nem ativação do contrato.
- O upload ao armazenamento externo ocorre antes da transação local e não pode
  ser revertido pela transação PostgreSQL. Falha local pode deixar objeto órfão;
  esta condição preexistente não é resolvida por R1-40.
- Não ativar consumidor/dispatcher, leitura automática ou publicação. Nenhuma
  migration ou alteração OpenAPI.

## Consequências

Os fatos de upload e atividade ficam correlacionados à auditoria e ao request. A
durabilidade do objeto e a transação dos registros locais continuam fronteiras
separadas, sem compensação distribuída.

## Protocolo do incremento

- **Antes:** documento/estado/atividade/auditoria eram locais; atividade e upload
  não tinham fatos próprios na outbox.
- **Depois:** ambas as outbox entries são gravadas na transação local.
- **Aceite:** eventos contêm IDs mínimos e correlação; o contrato permanece
  `SIGNED_UPLOADED` e o gate não avança.
- **Testes:** guards de tipo/versão/payload; integração verifica evento do upload,
  atividade e ausência de ativação.
- **Rollback:** remover apenas os novos contratos/emissões; preservar upload,
  atividade, auditoria, estado, permissão e gate existentes.

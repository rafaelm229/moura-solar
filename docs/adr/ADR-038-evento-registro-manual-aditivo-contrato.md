# ADR-038 — Evento para registro manual de aditivo

**Data:** 09/10/2026

**Status:** Decisão aprovada

**Escopo:** R1-38, SPEC-007, SPEC-016 e SPEC-019

## Contexto

O comando existente `createAmendment` atualiza o estado do contrato para
`AMENDED`, acrescenta o motivo às notas e grava a auditoria
`CONTRACT_AMENDMENT_CREATED` em uma transação local. O comando não cria um
registro/versionamento de aditivo nem documento próprio.

## Decisão

- Emitir `CONTRACT_AMENDMENT_RECORDED` v1 na mesma transação do estado/notas e da
  auditoria.
- Usar agregado `Contract`, produtor `contracts`, request ID como correlação e
  ID da auditoria como chave de deduplicação.
- Restringir o payload a `contractId`, `auditEventId` e `opportunityId`.
- Não publicar motivo, notas, alterações estruturadas ou conteúdo do contrato.
- Preservar rota, permissão `contracts:create_amendment`, regra atual de estado,
  gravação de notas e resposta. Nenhuma migration ou alteração OpenAPI.
- Não afirmar que o aditivo completo da SPEC-007 foi implementado. Documento
  próprio, versão-base, alterações estruturadas e aprovações seguem pendentes.
- Não ativar dispatcher, consumidor, compensação ou efeito financeiro.

## Consequências

O comando existente fica correlacionável com a auditoria na outbox sem introduzir
documento ou semântica legal nova. Falha ao persistir o evento reverte os efeitos
locais do comando.

## Protocolo do incremento

- **Antes:** o registro atualizava estado/notas e auditoria atomicamente, sem fato
  compartilhável na outbox.
- **Depois:** persiste também `CONTRACT_AMENDMENT_RECORDED` v1 na transação local.
- **Contrato:** payload de IDs mínimos; dedupe pela auditoria; request ID como
  correlação; sem `causationId` adicional.
- **Aceite:** sucesso grava fato e auditoria; falha forçada no insert da outbox
  reverte estado, notas e auditoria; payload não inclui razão/detalhes.
- **Testes:** guard do pacote e integração PostgreSQL com persistência,
  correlação, payload mínimo e rollback.
- **Rollback:** retirar somente a emissão e o contrato do evento; preservar o
  comando atual, sua autorização e auditoria.

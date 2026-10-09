# ADR-014 — Outbox local para registro de entrega de proposta

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-14; publicação e consumidor permanecem fora
do incremento.

**Escopo:** R1, SPEC-006, SPEC-016 e SPEC-019

## Contexto

O sistema registra uma entrega depois que a pessoa envia a proposta por seu
canal autorizado. O comando persiste a entrega, atualiza a versão, pode avançar a
oportunidade, cria atividade de acompanhamento e auditoria em uma transação local.
O fato ainda não possuía linha na outbox de integração.

## Decisão

- Persistir `PROPOSAL_DELIVERED` v1 na `IntegrationOutbox` na mesma transação
  local que registra a entrega e seus efeitos atuais.
- O evento representa o registro manual da entrega no sistema; não envia
  mensagem, verifica recebimento nem afirma leitura pelo destinatário.
- Usar o ID da proposta como agregado, `sentAt` do registro como instante,
  `requestId` como correlação e `ProposalDelivery.id` como chave de deduplicação.
- Payload contém somente `proposalId`, `proposalVersionId`, `deliveryId` e
  `opportunityId`; não inclui destinatário, canal, notas ou conteúdo do documento.
- Manter o evento não publicado e não ativar dispatcher, consumidor, provedor,
  WhatsApp ou outro transporte.
- Preservar autorização, validação de PDF pronto, validade, transições,
  atividade, auditoria e contrato HTTP existentes.

## Consequências e controles

- Nenhuma migration: R1-14 usa `IntegrationOutbox` existente.
- Falha na outbox reverte registro de entrega, status, transição aplicável,
  atividade e auditoria na transação local.
- A chave por organização e ID da entrega evita duplicar o evento por envio
  registrado.
- O evento não comprova envio externo. Eventual consumidor futuro precisa de
  contrato e evidência próprios, além de inbox/idempotência e política operacional.
- Fluxo de importação de contas permanece manual pela ADR-008.

## Evidência necessária para R1-14

Teste do contrato versionado e integração do fluxo real com correlação, payload
mínimo sem destinatário/canal, `publishedAt` nulo e rollback forçado; `pnpm
check`, CI completa, links e `git diff --check`.

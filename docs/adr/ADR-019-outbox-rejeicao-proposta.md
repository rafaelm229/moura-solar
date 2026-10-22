# ADR-019 — Outbox local para rejeição de proposta

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-19; publicação e consumidor permanecem fora
do incremento.

**Escopo:** R1, SPEC-006, SPEC-016 e SPEC-019

## Contexto

`ProposalService.recordRejection` marca uma versão como `REJECTED`, acrescenta o
motivo às observações e registra auditoria numa transação local. A linha de
auditoria já possui ID próprio e imutável. O controlador aplica a permissão
`proposals:reject`, mas não encaminhava o `requestId` ao serviço.

## Decisão

- Persistir `PROPOSAL_REJECTED` v1 na `IntegrationOutbox` na mesma transação da
  atualização da versão e da auditoria.
- Preservar autorização, validações, status e conteúdo das observações atuais;
  este incremento não adiciona gates nem altera a jornada da proposta.
- Usar proposta como agregado e `requestId` do comando como correlação.
- O payload contém `rejectionId` (ID da auditoria), `proposalId`,
  `proposalVersionId` e `opportunityId`; não inclui motivo, notas, observações,
  snapshots nem valores comerciais.
- Deduplicar pelo ID imutável da auditoria (`PROPOSAL_REJECTED:<rejectionId>`),
  permitindo rastrear cada registro durável sem migration ou tabela paralela.
- Manter o evento não publicado, sem dispatcher, consumidor, broker ou chamada
  externa.

## Consequências e controles

- Nenhuma migration: R1-19 reutiliza `IntegrationOutbox` e `AuditEvent`.
- Falha ao inserir o evento reverte status/observações e auditoria na transação.
- Cada rejeição registrada gera identidade própria via auditoria; o payload
  permanece sem texto potencialmente sensível.
- Um consumidor futuro exige contrato, inbox/idempotência, política operacional
  e evidência próprios.
- A importação de contas permanece manual conforme ADR-008; não há dependência
  com OCR ou processamento documental.

## Evidência necessária para R1-19

Teste do contrato versionado e integração com autorização, correlação, IDs,
payload mínimo, `publishedAt` nulo e rollback forçado; `pnpm check`, CI completa,
links locais e `git diff --check`.

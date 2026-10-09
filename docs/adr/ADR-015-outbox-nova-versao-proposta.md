# ADR-015 — Outbox local para nova versão de proposta

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-15; publicação e consumidor permanecem fora
do incremento.

**Escopo:** R1, SPEC-006, SPEC-016 e SPEC-019

## Contexto

`ProposalService.createNextVersion` cria uma versão copiando os snapshots da
versão de origem e registra auditoria na transação local. A geração do PDF é
posterior à transação. O fato de criar outra versão não possuía evento durável.

## Decisão

- Persistir `PROPOSAL_VERSION_CREATED` v1 na `IntegrationOutbox` junto da nova
  versão e auditoria, na mesma transação local.
- Representar somente a criação da versão. Não afirmar PDF pronto, envio,
  aprovação ou alteração de preço.
- Usar a proposta como agregado; `createdAt` da versão como instante e
  `requestId` como correlação.
- Payload contém `proposalId`, `proposalVersionId`, `basedOnVersionId` e
  `opportunityId`; não inclui snapshots, documentos, preço, conteúdo comercial
  ou dados pessoais.
- Deduplicar pelo ID da nova versão (`PROPOSAL_VERSION_CREATED:<versionId>`).
- Manter não publicado, sem dispatcher, consumidor, broker ou integração
  externa.
- Preservar a lógica de versionamento, cópia de snapshot, autorização, auditoria
  e geração de PDF atuais.

## Consequências e controles

- Nenhuma migration: R1-15 reutiliza `IntegrationOutbox`.
- Falha ao inserir a outbox reverte versão e auditoria; não deixa versão sem
  evento.
- Geração de PDF continua posterior. Falha de PDF não desfaz a versão/evento e
  não altera a semântica do fato.
- Um consumidor futuro requer contrato, inbox/idempotência, política operacional
  e evidência próprios.
- Fluxo de importação de contas permanece manual pela ADR-008.

## Evidência necessária para R1-15

Teste do contrato versionado e integração do fluxo real com correlação, linhagem
mínima, `publishedAt` nulo e rollback forçado; `pnpm check`, CI completa, links
locais e `git diff --check`.

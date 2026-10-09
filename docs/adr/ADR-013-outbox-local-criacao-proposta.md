# ADR-013 — Outbox local para criação de proposta

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-13; publicação e consumidor permanecem fora
do incremento.

**Escopo:** R1, SPEC-006, SPEC-016 e SPEC-019

## Contexto

O R1 já persiste `PROPOSAL_ACCEPTED` na outbox local. A criação de proposta
grava proposta, primeira versão e auditoria na mesma transação, mas ainda não
registrava esse fato para integração. A geração do PDF ocorre depois dessa
transação; portanto, criação de entidade e prontidão do documento são fatos
distintos.

## Decisão

- Persistir `PROPOSAL_CREATED` v1 na `IntegrationOutbox` dentro da transação
  existente que cria proposta, versão inicial e auditoria.
- Definir o evento como confirmação da criação do registro e de sua versão
  inicial, sem afirmar que o PDF foi gerado ou está pronto.
- Usar a organização e o ID da proposta como agregado, `proposal.createdAt`
  como instante do evento, `requestId` como correlação e a proposta como chave
  de deduplicação.
- Payload contém somente `proposalId`, `proposalVersionId` e `opportunityId`.
  Não copiar snapshots, dados pessoais, preço, observações ou conteúdo comercial.
- Persistir o evento como não publicado; não adicionar dispatcher, consumidor,
  transporte, retry, replay ou mudança de estado.
- Não alterar geração/armazenamento de PDF, contrato HTTP, autorização, gates,
  snapshots, validade ou regras da SPEC-006.

## Consequências e controles

- Nenhuma migration: a linha usa `IntegrationOutbox` existente. Rollback remove
  somente o produtor e preserva estrutura e linhas existentes.
- Falha ao inserir o evento reverte proposta, versão inicial e auditoria na
  transação local. Uma falha posterior ao criar o PDF não invalida o evento, que
  significa somente criação do registro.
- A chave única por organização e `PROPOSAL_CREATED:<proposalId>` evita gravar
  dois eventos para a mesma proposta.
- A outbox não prova entrega. Antes de ativar publicação, definir consumidor,
  inbox, idempotência, retries, retenção, observabilidade e reconciliação.
- O fluxo de importação de contas continua manual conforme ADR-008; R1-13 não
  ativa OCR ou serviços externos.

## Evidência necessária para R1-13

Teste do contrato versionado e integração com correlação, payload mínimo,
`publishedAt` nulo e rollback forçado; `pnpm check`, `pnpm test:integration`,
CI completa, links e `git diff --check`.

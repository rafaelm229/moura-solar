# ADR-041 — Evento de criação do contrato

**Data:** 09/10/2026

**Status:** Decisão aprovada para o incremento R1-41

**Escopo:** R1-41, SPEC-007, SPEC-016 e SPEC-019

## Contexto

A criação do contrato a partir de uma proposta aceita persiste contrato, versão,
documentos, gate pendente, plano financeiro elegível, atividade de assinatura e
auditoria em uma transação PostgreSQL. O comando ainda não registra na outbox o
fato de criação nem a atividade gerada.

## Decisão

- Emitir `CONTRACT_CREATED` v1 e `ACTIVITY_CREATED` na transação local da criação
  do contrato, versão, gate, plano/recebíveis elegíveis, atividade e auditoria.
- Usar agregado `Contract`, produtor `contracts`, request ID como correlação e
  auditoria/contrato como chave de deduplicação do fato de contrato.
- O payload do contrato contém somente `contractId`, `contractVersionId`,
  `acceptedProposalVersionId`, `auditEventId` e `opportunityId`. A atividade
  contém somente os IDs previstos pelo contrato `ACTIVITY_CREATED`.
- Não incluir snapshots, preço, condições, dados de clientes, conteúdo, nomes ou
  metadados dos DOCX/PDF.
- Repetir a criação de contrato já existente não cria nova auditoria nem eventos.
- Preservar geração e conteúdo dos PDFs/DOCX, estado `READY`, gates, vínculo com
  proposta aceita, plano financeiro, permissões e resposta da API.
- Não ativar consumidor/dispatcher nem mudar o gate, financeiro ou publicação.
  Sem migration ou alteração OpenAPI.
- Os uploads dos DOCX/PDF ao armazenamento externo ocorrem dentro da execução
  da transação local. Uma falha de banco após o upload pode deixar objetos órfãos;
  R1-41 não introduz compensação distribuída.

## Protocolo do incremento

- **Antes:** criação, atividade e auditoria eram locais; nenhum evento de criação
  do contrato era gravado.
- **Depois:** a criação grava ambos os fatos na outbox, com correlação e payloads
  mínimos, dentro da mesma transação PostgreSQL.
- **Aceite:** parser restringe os campos; integração valida IDs, correlação,
  ausência de duplicatas no replay, PDFs/DOCX e gate ainda pendente.
- **Rollback:** remover somente os novos contratos e emissões; preservar toda a
  criação, documentos, auditoria, atividade, gate e comportamento financeiro.

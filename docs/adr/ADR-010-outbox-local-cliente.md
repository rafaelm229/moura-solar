# ADR-010 — Outbox local para cadastro de cliente

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-10; publicação e consumidor permanecem fora
do incremento.

**Escopo:** SPEC-004, SPEC-016 e SPEC-019

## Contexto

O cadastro de cliente já persiste a entidade e a auditoria na mesma transação.
Com a extração gradual do domínio CRM, outros domínios precisarão referenciar o
cliente sem copiar sua fonte de verdade. R1-09 já criou a outbox local; este
incremento registra somente o fato `CUSTOMER_CREATED`.

## Decisão

- Persistir o evento v1 na mesma transação local do cadastro e da auditoria.
- Usar `Customer` como agregado e `customer.createdAt` como instante do fato.
- Usar o `requestId` existente como `correlationId` e
  `CUSTOMER_CREATED:<customerId>` como chave de deduplicação.
- O envelope e payload contêm apenas organização, identificadores, produtor,
  correlação e instante. Não copiar nome, telefone, e-mail, documento, endereço,
  notas ou outros dados pessoais.
- Manter `publishedAt` nulo. Não ativar consumidor, polling, worker, retry,
  replay, broker ou serviço externo.
- Não alterar `ImportOutbox`, contratos HTTP, resposta do cadastro, regras de
  duplicidade, autorização ou demais efeitos do domínio.

## Consequências e controles

- Nenhuma migration: R1-10 reutiliza `IntegrationOutbox` e é aditivo em código.
- Se a inserção do evento falhar, cadastro, contatos, endereço e auditoria da
  transação também são revertidos.
- O payload permite identificar o fato; consumidores futuros devem consultar o
  dono do cliente sob autorização e definir idempotência/inbox antes de ativar.
- Rollback reverte o produtor sem excluir a tabela ou linhas de eventos já
  persistidas. Não habilita despacho nem define política final de retenção.

## Evidência necessária para R1-10

Testes do contrato v1; integração confirma correlação, payload sem PII e rollback
atômico; `pnpm check`, `pnpm test:integration` e `git diff --check`. Não há teste
de entrega pois nenhum consumidor é ativado.

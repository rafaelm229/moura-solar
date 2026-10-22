# ADR-009 — Outbox local para aceite de proposta

**Data:** 09/10/2026

**Status:** Decisão vigente para R1-09; publicação e consumidor permanecem fora
do incremento.

**Escopo:** R1, SPEC-006, SPEC-016 e SPEC-019

## Contexto

R1-08 definiu o contrato v1 de `PROPOSAL_ACCEPTED`. A API já registra o aceite,
atualiza proposta/oportunidade e cria atividade na mesma transação. Para evitar
que o contrato dependa de uma emissão posterior vulnerável a crash, o fato deve
ser persistido na mesma transação local. Ainda não há consumidor justificado,
transporte aprovado ou política de retry operacional.

## Decisão

- Adicionar `IntegrationOutbox` no PostgreSQL operacional, sem instalar broker ou
  ativar worker.
- Inserir apenas o evento `PROPOSAL_ACCEPTED` v1 na transação existente de aceite.
- Usar a organização e o ID da proposta como escopo/agregado, `acceptedAt` como
  instante do evento, `requestId` como correlação e o ID de `ProposalAcceptance`
  como chave de deduplicação.
- Payload contém somente `acceptanceId`, `proposalVersionId` e `opportunityId`;
  não copiar nome, documento, preço, notas ou outros dados pessoais.
- O evento persiste como não publicado. Não há despacho, consumidor, tentativas,
  replay, descarte ou expiração nesta etapa. Linhas não são removidas
  automaticamente; retenção/arquivamento deve ser decidida antes de operação
  prolongada ou inclusão de novos produtores.
- A tabela referencia apenas a organização, não o agregado, para que remoções ou
  mudanças futuras do domínio não apaguem silenciosamente o registro do evento.
- Não alterar o `ImportOutbox` legado, a semântica de aceite, contratos HTTP,
  autorização, atividades, gates ou efeitos existentes.

## Consequências e controles

- A migration é aditiva; rollback reverte o código produtor e preserva tabela e
  linhas já gravadas. Não usar down migration destrutiva para apagar eventos.
- O `eventId` é o UUID da linha; a restrição única por organização e chave de
  deduplicação garante no máximo um evento para cada aceite persistido.
- O request repetido continua seguindo o conflito atual da SPEC-006 e não cria
  novo aceite nem novo evento.
- A outbox não constitui transporte nem prova entrega. Antes de liberar qualquer
  dispatcher, definir concorrência/lease, retries, inbox idempotente, replay,
  observabilidade, retenção e reconciliação em incremento próprio.
- Nenhum serviço externo, dado de conta de energia, worker ou broker é usado.

## Evidência necessária para R1-09

Migração em banco vazio e versão anterior com dados; integração confirma evento
na mesma transação e deduplicação pelo aceite; `pnpm check`, testes de migração e
integração; `git diff --check`. Falhas da transação não podem deixar o evento
isolado ou confirmar o aceite sem a linha outbox.

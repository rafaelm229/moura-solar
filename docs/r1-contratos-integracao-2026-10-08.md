# R1-01 — Envelope de eventos de integração

**Data:** 08/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Implementado em branch `codex/r1-integration-contracts`; CI remoto
aprovado e PR #23 mesclado em `feat/proposal-visual-clarity`. Revisão formal e
consolidação em `main` pendentes.

**SPECs:** [SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Dependência:** R0 no commit `224a77e`, incorporado pelo PR #22 ao commit
`4476d2d` de `feat/proposal-visual-clarity`. O CI do head do PR passou; a
revisão formal do baseline e a consolidação em `main` não estão registradas.

## Inventário e diferença

Antes deste incremento, `packages/contracts` continha apenas tipos de saúde e
erro da API. `ImportOutbox` já persiste eventos de importação de contas na mesma
transação, com `eventType` PascalCase, chave de deduplicação e payload próprios.
`AuditEvent` registra ações com `traceId`; a API aceita `x-request-id` compatível
com letras, números, `_` e `-`. O worker declara consumidores inativos. Esses
registros existentes não equivalem a um barramento ou inbox geral.

R1-01 adiciona um tipo exportado e validação de envelope comum em
`packages/contracts`. O contrato contém `eventId`, `eventType`, `schemaVersion`,
`occurredAt` (ISO 8601), `organizationId`, `aggregateId`, `producer`,
`correlationId` e `payload` objeto. `aggregateVersion` e `causationId` são
opcionais. IDs são texto não vazio: o `x-request-id` atual pode não ser UUID.
A validação cobre somente o envelope; tipo, versão e conteúdo do payload exigem
contrato de evento e validação próprios antes de qualquer consumidor. O retorno
preserva o objeto recebido. Nenhum evento passa a ser publicado por R1-01.

## Compatibilidade, aceite e rollback

- **Contratos:** a API de `packages/contracts` ganha `IntegrationEvent` e
  `parseIntegrationEvent`; os tipos e endpoints existentes permanecem iguais.
  `ImportOutbox` e `AuditEvent` não são reinterpretados ou convertidos.
- **Migração compatível:** nenhuma alteração de banco, migration, OpenAPI,
  cliente gerado, dado, worker ou configuração de deploy. Não há dual-write.
- **Aceite:** compilação e testes do pacote aceitam o envelope versionado e
  rejeitam correlação ausente, versões inválidas, timestamp inválido e payload
  que não seja objeto. `pnpm check` passou em 08/10/2026: Prettier, lint,
  typecheck, testes e builds; o pacote de contratos passou 3/3 casos novos.
  O check completo incluiu API 1.257/1.257 e web 5/5 testes. Partes não alteradas
  usaram cache local do Turbo; não houve execução de integração ou E2E nesta
  mudança sem produtor, consumidor ou interface.
- **Rollback:** reverter o commit de R1-01; como não há produtor/consumidor nem
  persistência nova, não é necessária reversão de dados ou drenagem.

## Riscos e limites

Um envelope estrutural não comprova durabilidade, autorização, idempotência,
ordenação, privacidade do payload ou replay. O consumidor deve validar
`eventType` e `schemaVersion` conhecidos e o payload específico; versões
desconhecidas não devem ser aplicadas. Antes de publicar um fato, definir
semântica, dados permitidos, propriedade, transação local, correlação, inbox,
retry, falha e reconciliação em incremento próprio. A escolha de transporte e
o ADR correspondente seguem pendentes; não introduzir broker por antecipação.

## Próximo recorte de R1

Inventariar um fato de domínio e sua transação, estabelecer contrato de payload
com o dono, decidir transporte/consumidor e demonstrar outbox → inbox com
duplicata, crash, replay e autorização. Não habilitar OCR por esse piloto.

## Acompanhamento após o PR #23

O PR #23 passou no CI remoto (`pnpm check`, migrations, integrações e E2E) e foi
mesclado em `feat/proposal-visual-clarity` no commit `055a026`. As imagens API/web
da árvore mesclada foram aplicadas somente ao Docker Compose local; health da
API e HTTP 200 da web foram verificados. A `main` e produção não foram alteradas.
O [R1-02](r1-correlacao-import-outbox-2026-10-08.md) continua a trilha de
integração sem ativar consumidores.

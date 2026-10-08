# R1-03 — Versão dos eventos do outbox de importação

**Data:** 08/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Implementado em branch `codex/r1-import-event-versioning`; CI, merge
e implantação local ainda pendentes.

**SPECs:** [SPEC-014](../specs/SPEC-014-importacao-contas-energia/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Dependências:** R1-01 (envelope versionado) e R1-02 (correlação de origem),
consolidados em `feat/proposal-visual-clarity`.

## Objetivo e diferença

As linhas novas de `ImportOutbox` já carregam `eventType`, `correlationId` e
payload mínimo na transação de negócio. Ainda não persistem versão do contrato;
`ImportOutboxClaim` também não expõe essa informação. R1-03 acrescenta
`schema_version` nullable e grava versão `1` para os eventos de importação já
produzidos pela API. A reivindicação do worker expõe a versão sem ativá-lo.
`packages/contracts` passa a exportar os contratos v1 usados pelos produtores da
API, incluindo o tipo do evento e a forma mínima do payload.

Contratos registrados:

- `ENERGY_BILL_IMPORT_QUEUED`, versão 1: `{ importId, documentVersionId }`.
  Intake e retry usam o mesmo contrato, com dedupe key própria.
- `ENERGY_BILL_IMPORT_APPLIED`, versão 1: `{ importId, reviewId }`.
- Somente identificadores são persistidos no payload; não incluir dados pessoais,
  bytes, conteúdo extraído ou credenciais.
- `schema_version = NULL` identifica linha legada sem versão declarada. Não
  inferir/backfill versão e não converter linha antiga. Consumidor futuro deve
  declarar suporte a essa forma antes de processá-la.

Os eventos continuam no outbox específico de importação. Não há publicação,
envelope durável novo, mudança de payload, consumidor, broker ou alteração de
estado de negócio. O worker/OCR permanece inativo.

## Dependências, contrato e migração

- **Dependências:** R1-01, R1-02, SPEC-014, SPEC-016 e SPEC-019.
- **Diferença antes/depois:** antes, o tipo do evento e o payload eram implícitos
  no código; depois, contratos tipados de `packages/contracts` são usados pelos
  produtores, toda linha nova declara versão 1 e a leitura interna disponibiliza
  versão conhecida ou `NULL` legado.
- **Compatibilidade:** a migration
  `20261008000200_import_outbox_schema_version` adiciona `schema_version INTEGER`
  nullable, sem default, backfill, índice ou constraint. Linhas antigas preservam
  status, dedupe key, correlação e payload. Código antigo ignora a coluna; novo
  aceita `NULL` legado. A criação do evento permanece na transação local original.
- **API:** sem mudança de endpoint, resposta, OpenAPI ou cliente gerado.
- **Rollback:** reverter API/worker; manter a coluna aditiva e as versões já
  gravadas. Não remover dados, reverter migration aplicada ou restaurar backup.

## Aceite e verificação

- Intake, retry e confirmação gravam as versões e payloads declarados na mesma
  transação que seus efeitos atuais; replays idempotentes não criam evento extra.
- Claim legado retorna `schemaVersion = NULL`; versão 1 é preservada na leitura.
- Migration em schema vazio e upgrade com linha legada mantém ID, status, dedupe,
  correlação e payload; redeploy não duplica linhas nem altera o estado.
- `PATH=/tmp/moura-solar-r0-bin:$PATH pnpm check`: passou no workspace; a
  configuração Prettier foi restaurada após ignorar os dois diretórios locais
  preexistentes e não rastreados.
- `PATH=/tmp/moura-solar-r0-bin:$PATH pnpm test:migrations`: quatro suítes
  passaram, incluindo upgrade com linha legada e redeploy desta migration.
- `PATH=/tmp/moura-solar-r0-bin:$PATH pnpm test:integration`: 106 testes passaram.
- `PATH=/tmp/moura-solar-r0-bin:$PATH pnpm test:e2e`: 40 testes passaram em
  schema isolado, removido ao final; incluiu importação, propostas, contratos,
  identidade, navegação, PDF/DOCX e viewports existentes.
- `PATH=/tmp/moura-solar-r0-bin:$PATH pnpm api:generate` e
  `git diff --exit-code -- packages/api-client`: passaram, sem alteração gerada.
- CI da branch, merge e implantação local ainda não foram executados. Registrar
  seus resultados e ambiente antes de promover o estado.
- Nenhum teste inicia worker, chama provedor OCR ou exige broker.

## Limites e próximo recorte

Versão declarada não valida todos os payloads, não prova entrega, inbox, replay
ou saga e não autoriza publicação. Antes de consumidor ativo, R1 deve definir
semântica de falha, hold/quarentena, reprocessamento autorizado, observabilidade,
transporte e demonstração de crash/duplicata para um consumidor aprovado.

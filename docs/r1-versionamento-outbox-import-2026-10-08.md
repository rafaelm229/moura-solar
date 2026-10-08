# R1-03 — Versão dos eventos do outbox de importação

**Data:** 08/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no commit `b0a153c` de
`feat/proposal-visual-clarity`; liberado somente no Compose local.
Produção não implantada.

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
- CI no PR #26 passou integralmente (workflow 77; instalação, `pnpm check`,
  geração de cliente, migrations, integração e E2E). O PR foi mesclado no commit
  `b0a153cc750ac28b76b48e6ee7139c6490064aab`.
- Implantação: revisão limpa do commit mesclado, Compose local
  `moura-solar-platform`. O dump PostgreSQL custom format foi gravado em
  `/tmp/moura-solar-r1-03-predeploy-20261008.dump` (29.477.235 bytes, modo 0600,
  SHA-256 `9a3fb03080e763fd56495ad91fffe42216c964ce34fe0ee0841380b6b83cda9f`)
  e validado com `pg_restore --list`. As imagens anteriores de API/tools foram
  preservadas com tags `pre-r1-03-20261008`.
- `docker compose ... run --rm --no-deps migrate` aplicou somente
  `20261008000200_import_outbox_schema_version`; a coluna foi confirmada nullable
  e o registro de migration, concluído. `docker compose ... up -d --no-deps
--no-build api` atualizou somente a API. Readiness da API passou, web respondeu
  HTTP 200, PostgreSQL/API/ClamAV ficaram healthy e MinIO/web permaneceram em
  execução. Nenhum worker foi iniciado; nenhum volume foi removido.
- Rollback operacional: voltar a imagem da API tagueada
  `pre-r1-03-20261008`; manter a migration/coluna aditiva e os dados. O backup
  permanece como proteção, não como procedimento de rollback padrão.
- Nenhum teste inicia worker, chama provedor OCR ou exige broker.

## Limites e próximo recorte

Versão declarada não valida todos os payloads, não prova entrega, inbox, replay
ou saga e não autoriza publicação. Antes de consumidor ativo, R1 deve definir
semântica de falha, hold/quarentena, reprocessamento autorizado, observabilidade,
transporte e demonstração de crash/duplicata para um consumidor aprovado.

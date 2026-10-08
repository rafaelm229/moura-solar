# R1-02 — Correlação do outbox de importação existente

**Data:** 08/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Implementado em branch `codex/r1-import-correlation`; CI remoto,
revisão e consolidação pendentes.

**SPECs:** [SPEC-014](../specs/SPEC-014-importacao-contas-energia/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Dependências:** [R1-01](r1-contratos-integracao-2026-10-08.md) no PR #23,
mesclado em `feat/proposal-visual-clarity` no commit `055a026`. R0 e a revisão
formal do baseline continuam documentados separadamente; a `main` ainda não
contém esta cadeia.

## Inventário, diferença e contratos

A API já associa um `traceId` sanitizado a requisições. Os comandos de intake,
retry e confirmação de importação gravam `ImportOutbox` na mesma transação do
efeito de negócio, mas não persistiam esse ID. `ExtractionAttempt.correlationId`
identifica a tentativa do worker e não substitui a origem da requisição.

R1-02 acrescenta `correlation_id` opcional a `import_outbox`, grava o `traceId`
nos três eventos novos e o expõe na estrutura interna da reivindicação do
worker. A chave de deduplicação, o payload, as transições, as permissões e os
gates permanecem iguais. Não há endpoint, resposta, OpenAPI ou contrato de
payload novo. O [envelope R1-01](../packages/contracts/src/integration-event.ts)
continua sem produtor/consumidor; R1-02 apenas preserva a correlação de origem
para futura adaptação explícita.

## Migração, aceite e rollback

- **Migração compatível:**
  `20261008000100_import_outbox_correlation` adiciona uma coluna nullable sem
  default ou backfill inventado. Linhas antigas mantêm `NULL`; código antigo
  ignora a coluna e código novo aceita ambas as formas. Não há índice ou
  infraestrutura adicional.
- **Aceite:** a migration deve aplicar em schema vazio e sobre a versão anterior
  com linha legada, preservando ID, status, dedupe e payload; redeploy deve ser
  idempotente. Intake/retry/confirmação persistem o ID recebido; repetir a chave
  idempotente não cria evento nem troca sua correlação. A leitura do worker
  aceita `NULL` histórico. Autorização positiva/negativa e transação continuam
  cobertas pelas integrações existentes.
- **Verificação local:** `pnpm check` passou (formatação, lint, tipos, API
  1.257/1.257, web 5/5 e builds; parte das tarefas usou cache Turbo).
  `pnpm test:migrations` passou nas três suítes, incluindo upgrade com linha
  legada, e as integrações completas passaram 106/106 em schemas isolados.
  O teste direcionado de importação/worker passou 11/11. `pnpm api:generate`
  reproduziu o cliente sem diff. CI do PR ainda será registrado.
- **Rollback:** voltar o código API/worker anterior; a coluna aditiva pode
  permanecer sem efeito. Não apagar dados, desfazer migrations aplicadas ou
  restaurar banco antigo por causa deste campo. Uma nova correlação não será
  escrita até o código atualizado voltar a ser implantado.

## Limites e próximo recorte

Um ID persistido não prova rastreamento de ponta a ponta, entrega a consumidores,
inbox, replay ou saga. Eventos legados permanecem sem correlação de requisição;
não inferir um ID a partir de timestamp ou auditoria. O worker segue inativo e
OCR automático continua condicionado à PoC e às decisões operacionais.

Próximo recorte de R1: definir um fato e consumidor necessários, contrato de
payload e política de versões, ADR de transporte, inbox idempotente e ensaios
de crash/replay antes de ativar fluxo distribuído.

# R1-49 — Correlação HTTP sem copiar credenciais aos logs

**Data:** 10/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #104, merge `8c86b56`; CI run `38023737212` verde.

**SPEC:** [SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md), REF-09.

**Dependências:** R1-48 valida whitelist/fallback de `x-request-id`; middleware
de logging existente registra campos selecionados da requisição.

## Protocolo do incremento

- **Antes:** teste R1-48 verificava o cabeçalho, limite e fallback; não
  inspecionava o log produzido por uma requisição.
- **Depois:** o harness de integração captura stdout da API e verifica que o
  registro `request completed` contém traceId, método, status e duração, sem
  copiar `Authorization`, cookie ou um cabeçalho privado enviado no mesmo pedido.
- **Contratos:** sem alteração de cabeçalho, resposta, payload ou formato de log.
  A correlação continua idêntica em `x-request-id` e no campo `traceId`.
- **Migração compatível:** nenhuma; sem mudança de runtime, banco ou dependências.
- **Aceite:** o log correlacionável permanece; os valores-sentinela dos
  cabeçalhos confidenciais não aparecem na linha correspondente.
- **Rollback:** remover captura/assertivas de stdout e esta referência; sem efeito
  persistido ou serviço a reverter.

## Validação

- `node --test --test-concurrency=1 tests/identity.integration.mjs` — passou,
  17/17 cenários.
- Prettier, links locais, `git diff --check` e `pnpm check` — passaram.
- CI do PR #104 — passou no run `38023737212` (`pnpm check`, migrações,
  integração e E2E); PR consolidado por squash em
  `8c86b5640eabff7173e085965ba1c7e63dbe18a5`.

## Limites

O teste cobre os cabeçalhos enviados no cenário de readiness e o logger atual da
API. Não audita logs de cada domínio, logs do worker ou provedores externos; o
worker segue inativo.

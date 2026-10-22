# R1-48 — Validação do identificador de correlação HTTP

**Data:** 10/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #102, merge `08a55e9`; CI run `38022529871` verde.

**SPEC:** [SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md), REF-09.

**Dependências:** middleware de `x-request-id` existente; R1-43 prova
durabilidade de eventos correlacionados no restart da API.

## Protocolo do incremento

- **Antes:** o middleware aceitava IDs com caracteres `[A-Za-z0-9_-]`, até 100
  caracteres, e substituía valor inválido por UUID; testes cobriam a correlação
  propagada, mas não o limite e fallback do middleware.
- **Depois:** integração HTTP confirma a aceitação do formato válido e a geração
  de UUID para valor com espaço e valor acima de 100 caracteres.
- **Contratos:** sem alteração. O cabeçalho válido continua sendo ecoado em
  `x-request-id` e usado pela correlação existente; valores inválidos continuam
  sendo substituídos por UUID.
- **Migração compatível:** nenhuma; sem alteração de runtime, banco, cliente ou
  dependência.
- **Aceite:** resposta `health/ready` mantém cabeçalho seguro válido e retorna
  UUID para entrada fora da whitelist ou do limite.
- **Testes:** `node --test --test-concurrency=1 tests/identity.integration.mjs`;
  o teste é executado contra PostgreSQL local e API iniciada pelo harness.
- **Rollback:** remover o caso de teste e esta referência; não há efeito
  persistido nem infraestrutura a reverter.

## Validação

- `node --test --test-concurrency=1 tests/identity.integration.mjs` — passou,
  16/16 cenários, incluindo validação de correlação e restart.
- Prettier, links locais, `git diff --check` e `pnpm check` — passaram.
- CI do PR #102 — passou no run `38022529871` (`pnpm check`, migrations,
  integração e E2E); PR consolidado por squash em
  `08a55e94841b2f68235d9caf988d9da0497fcceb`.

## Limites

O teste cobre whitelist, tamanho e fallback do identificador. Não prova que um
valor sintaticamente válido não contenha dado pessoal fornecido pelo cliente,
nem completa rastreamento distribuído entre serviços.

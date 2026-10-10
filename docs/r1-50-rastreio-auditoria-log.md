# R1-50 — Rastreio da operação entre HTTP, auditoria e log

**Data:** 10/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #106, merge `8694c648df164809e698c30ac4b97273f41e03dd`.

**SPEC:** [SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md), REF-09.

**Dependências:** R1-48 valida o header de correlação; R1-49 valida log sem
credenciais; endpoint de login já propaga o request ID para auditoria.

## Protocolo do incremento

- **Antes:** testes separados cobriam o log HTTP, a auditoria de login e a
  correlação de eventos de domínio; nenhum caso ligava o mesmo identificador
  entre resposta HTTP, auditoria e log numa operação concreta.
- **Depois:** um login autenticado usa `x-request-id` conhecido; o teste confirma
  esse valor no evento de auditoria e na linha de conclusão do log, junto de
  método/status, sem email ou senha.
- **Contratos:** nenhum endpoint, cabeçalho, payload ou formato de log muda.
- **Migração compatível:** nenhuma; sem alteração de runtime, schema ou dados.
- **Aceite:** resposta de login é bem-sucedida; `AuditEvent.traceId` e log
  `traceId` igualam o cabeçalho; email/senha não aparecem na linha.
- **Rollback:** remover o teste e este relatório; sem efeito persistido ou
  serviço a reverter.

## Validação

- `node --test --test-concurrency=1 tests/identity.integration.mjs` — passou,
  18/18 cenários.
- Prettier, links locais, `git diff --check` e `pnpm check` — passaram.
- CI run `38025120816` — verde (`pnpm check`, migrations, integração e E2E).

## Limites

O teste cobre uma operação local de identidade. Não prova rastreamento distribuído
entre serviços, publicação/consumo de eventos ou correlação em toda jornada.

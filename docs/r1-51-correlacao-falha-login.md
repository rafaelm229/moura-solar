# R1-51 — Correlação da falha de login sem credenciais nos logs

**Data:** 10/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #108, merge `dc3f7bc43f902297029bcdc71b07a1bc9c7d37e8`.

**SPEC:** [SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md), REF-09.

**Dependências:** R1-50 consolidado; login inválido já registra auditoria com o
request ID e a API já escreve log de conclusão correlacionado.

## Protocolo do incremento

- **Antes:** R1-50 comprovava a correlação numa autenticação bem-sucedida; a
  falha de credenciais não tinha teste cobrindo request, auditoria e log juntos.
- **Depois:** o teste de integração envia credenciais inválidas com um
  `x-request-id` conhecido e confirma HTTP 401, `identity.login_failed` com o
  mesmo `traceId` e log de conclusão 401 sem email ou senha.
- **Contratos:** nenhum endpoint, resposta, cabeçalho, payload ou formato de log
  muda.
- **Migração compatível:** nenhuma; sem alteração de runtime, schema ou dados
  fora do schema isolado criado pelo teste.
- **Aceite:** o evento de auditoria e o log compartilham o ID enviado; valores de
  email e senha sentinela não aparecem no log.
- **Rollback:** remover o teste e este relatório; sem efeito persistido ou
  serviço a reverter.

## Validação

- `node --test --test-concurrency=1 tests/identity.integration.mjs` — passou,
  19/19 cenários, incluindo o caso novo de falha.
- Prettier nos arquivos afetados, links locais e `git diff --check` — passaram.
- `pnpm check` local foi interrompido por `prettier --check .` nos artefatos
  locais não rastreados `.vscode/mcp.json` e `moura-solar-specs-roadmap/`; esses
  caminhos foram preservados sem edição. CI run `38058068458` passou com
  `pnpm check`, migrations, integração e E2E.
- CI — pendente.

## Limites

O teste cobre apenas falha por credenciais inválidas no login. Não altera política
de resposta, rate limit, sessão, outbox, consumidor ou rastreamento distribuído.

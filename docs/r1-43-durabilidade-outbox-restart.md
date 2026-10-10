# R1-43 — Durabilidade dos eventos após reinício da API

**Data:** 10/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #93, merge `833132b45e0ae4732aec96ceac3b4d8d65cb96c5`.

**SPECs:** [SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md), critério EVT-01; família F-34.

**Dependências:** R1-42 consolidado; eventos de revisão/aprovação já persistidos
atomicamente com estado e auditoria.

## Diferenças antes/depois

- **Antes:** testes confirmavam transação, payload e correlação no banco enquanto
  o processo da API permanecia ativo.
- **Depois (R1-43):** a integração encerra abruptamente e reinicia a API após os
  eventos serem confirmados; consulta os mesmos registros e valida que a sessão
  existente continua utilizável.
- **Contratos:** sem mudanças em eventos, payloads ou endpoints.
- **Banco/migração:** sem mudança de schema ou migration; PostgreSQL continua
  sendo a fonte de verdade.
- **Limites:** demonstra persistência após restart do produtor; não prova crash
  entre operações de commit, transporte, publicação, consumo, retry ou replay.

## Critérios de aceite

- Os eventos `CONTRACT_REVIEW_REQUESTED` e `CONTRACT_APPROVED` e suas auditorias
  sobrevivem ao encerramento abrupto e à reinicialização da API.
- A correlação, o payload e os IDs continuam iguais após o restart.
- O endpoint de identidade autenticada volta a responder com a sessão existente.
- Nenhum novo evento ou efeito de negócio é criado pelo restart.

## Testes e rollback

- Executar `node --test --test-concurrency=1 tests/contract.integration.mjs` com
  PostgreSQL e armazenamento locais.
- Executar `pnpm check`, migrations, integração completa e E2E no CI.
- Validação local: build da API passou; integração contratual passou com 9/9
  cenários; `pnpm check` passou; `git diff --check` e links locais passaram.
- A integração inclui `SIGKILL`, aguarda readiness, confirma que a sessão é
  reutilizável e verifica IDs, payloads, correlação, auditorias e ausência de
  publicação/duplicação após o restart.
- CI run `38015253401` — passou: check, geração de API, migrações, integração
  completa e E2E.
- PR #93 foi consolidado em `feat/proposal-visual-clarity` pelo merge
  `833132b45e0ae4732aec96ceac3b4d8d65cb96c5`.
- Rollback remove o teste de restart e esta referência documental; não há
  alteração de runtime, contrato, banco ou dados a reverter.

## Contratos, risco e pendências

Não introduz contrato, migração ou nova regra. O teste pode revelar vazamento de
conexão ou atraso de inicialização; reinício deve aguardar readiness antes de
validar os registros. EVT-02 a EVT-05 continuam sem prova de consumidor durável.

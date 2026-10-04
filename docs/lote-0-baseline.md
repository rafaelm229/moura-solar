# Lote 0 — Baseline e correções verificadas

## Incremento A10 — propriedade entre cliente, unidade consumidora e oportunidade

**Estado:** corrigido e coberto por integração em 04/10/2026.

Antes da correção, a API verificava apenas se a unidade consumidora pertencia à
organização ao criar ou atualizar uma oportunidade. Isso permitia associar à
oportunidade de um cliente uma UC de outro cliente do mesmo tenant. A criação de
UC também aceitava um endereço pertencente a outro cliente.

A validação agora exige, dentro da transação de escrita:

- o endereço da nova UC pertence ao cliente da rota;
- a UC informada ao criar uma oportunidade pertence ao cliente indicado;
- a UC informada ao atualizar uma oportunidade pertence ao cliente já associado;
- ausência ou divergência retorna 404 sem revelar o registro de outro contexto.

O teste `tests/commercial.integration.mjs` exercita endereço e UC cruzados,
criação e atualização rejeitadas, vínculos válidos e persistência do vínculo
aceito. Usa PostgreSQL local na porta 5433 e schema aleatório `test_comm_*`,
removido ao final do teste.

## Incremento A09 — criar e vincular a UC em uma operação

O formulário de consumo fazia POST para criar a UC e depois PATCH para associá-la
à oportunidade. Se a segunda chamada falhasse, a UC ficava persistida sem vínculo
com a oportunidade. A rota autenticada
`POST /opportunities/:opportunityId/utility-unit` agora executa ambos os efeitos
na mesma transação, valida `expectedVersion`, exige as permissões de gestão de UC
e atualização da oportunidade no contexto e grava a chave idempotente junto com
os efeitos. O formulário usa uma chave estável por payload, permitindo retentar
sem criar outra UC.

`tests/commercial.integration.mjs` cobre conflito de versão sem UC órfã,
persistência do vínculo, replay idempotente e rejeição da mesma chave com outro
payload, negação por escopo, bem como os cenários A10 de vínculo cruzado.
Em conflito 409, o formulário invalida a oportunidade para atualizar sua versão
e conserva os dados digitados para uma nova tentativa explícita.

## Validação

- `PATH="$PWD/.bin:$PATH" pnpm api:generate`: OpenAPI e cliente TypeScript
  regenerados;
- `PATH="$PWD/.bin:$PATH" node --test tests/commercial.integration.mjs`: 8/8
  com PostgreSQL local, em schema temporário removido ao final;
- `PATH="$PWD/.bin:$PATH" pnpm exec playwright test tests/e2e/design.spec.ts`:
  4/4 em 360, 768, 1024 e 1440 px, sem rolagem horizontal;
- `PATH="$PWD/.bin:$PATH" pnpm check`: formato, lint, tipos, testes e builds
  aprovados; API 1.208 testes, web 5 e PoC 24.

Este registro cobre as reproduções A09/A10. A baseline completa ainda deve
avaliar A08 e A15. A persistência insegura identificada em A11 foi tratada no
incremento do lote 4, registrado em `docs/lote-4-revisao-e-validacao.md`.

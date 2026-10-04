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

Validação executada:

- `PATH="$PWD/.bin:$PATH" node --test tests/commercial.integration.mjs`: 6/6;
- `PATH="$PWD/.bin:$PATH" pnpm check`: formato, lint, tipos, testes e builds
  aprovados; API 1.208 testes, web 5 e PoC 24.

Este registro cobre somente a reprodução A10. A baseline completa ainda deve
avaliar A08/A09 e A15. A persistência insegura identificada em A11 foi tratada
no incremento do lote 4, registrado em `docs/lote-4-revisao-e-validacao.md`.

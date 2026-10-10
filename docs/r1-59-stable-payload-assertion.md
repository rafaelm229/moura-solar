# R1-59 — Asserção estável para payload mínimo

**Data:** 10/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Implementado na branch `codex/r1-59-stable-payload-assertion`.

**SPECs:** [SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Dependências:** R1-56 cobre o envelope; no primeiro run `38066193240`, o teste
de integração existente falhou ao buscar `875` dentro do JSON do payload, que
inclui um UUID aleatório de auditoria.

## Protocolo do incremento

- **Antes:** a asserção usava busca de substring para provar que
  `estimatedConsumption` não era emitido. Ela também examinava o `auditEventId`,
  criando um falso positivo se qualquer UUID contivesse `875`.
- **Depois:** a asserção consulta diretamente se a propriedade
  `estimatedConsumption` existe no payload. As demais verificações de
  minimização e a comparação estrutural do payload permanecem.
- **Contratos:** nenhum contrato, payload ou comportamento de produção mudou.
- **Migração compatível:** nenhuma; sem alteração de schema, dependências,
  configuração ou dados.
- **Aceite:** a ausência da propriedade privada é verificada sem depender do
  conteúdo de IDs gerados aleatoriamente.
- **Rollback:** reverter a asserção e este relatório; sem efeito persistido ou
  serviço a reverter.

## Validação

- Prettier dos arquivos afetados e `git diff --check` — passaram.
- `pnpm test:integration` foi tentado, mas os 13 arquivos de integração
  encerraram antes dos casos. O teste espera PostgreSQL local na porta 5433; o
  acesso ao Docker foi negado neste ambiente e `pg_isready` não está instalado.
- CI completa — pendente.

## Limites

Corrige somente a determinismo do teste. Não altera regras de domínio, transporte,
worker, broker ou consumidor. A importação de contas continua manual conforme
[ADR-008](adr/ADR-008-importacao-manual-sem-ocr.md).

# R1-04 — Validador runtime dos eventos de importação v1

**Data:** 08/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no commit `ecb5884` de
`feat/proposal-visual-clarity`; não requer deploy sem consumidor runtime.

**SPECs:** [SPEC-014](../specs/SPEC-014-importacao-contas-energia/spec.md),
[SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md) e
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Dependências:** R1-01 (envelope compartilhado) e R1-03 (versão persistida),
consolidados na branch `feat/proposal-visual-clarity`.

## Objetivo e diferenças

R1-03 tipa os payloads em TypeScript, mas a checagem de envelope não valida
`eventType`, `schemaVersion` nem os campos do payload. Este incremento acrescenta
ao pacote compartilhado um parser runtime para os dois eventos de importação
existentes: `ENERGY_BILL_IMPORT_QUEUED` (`importId`, `documentVersionId`) e
`ENERGY_BILL_IMPORT_APPLIED` (`importId`, `reviewId`). Ele aceita somente versão 1
e preserva a referência/valores do objeto após validar identificadores textuais
não vazios.

Payload não objeto, campo obrigatório ausente/vazio, tipo desconhecido, versão
desconhecida ou versão legada `NULL` são rejeitados. Um consumidor futuro deve
tratar/quarentenar explicitamente a incompatibilidade antes de chamar o parser;
este incremento não declara suporte a linha histórica.

## Contratos e compatibilidade

- **Dependências:** R1-01, R1-03, SPEC-014, SPEC-016 e SPEC-019.
- **Antes/depois:** havia tipos compile-time para dois payloads; passam a existir
  validação runtime e união discriminada para ambos.
- **Compatibilidade:** sem migration, endpoint, OpenAPI, payload produzido,
  geração de cliente, alteração de status, publicação ou consumo. Sem nova
  dependência. Eventos legados `schemaVersion = NULL` permanecem intocados.
- **Ativação:** API continua usando imports apenas de tipo; o worker/OCR continua
  sem consumidores ativos. O parser é contrato compartilhado ainda não invocado
  por processamento operacional.
- **Rollback:** reverter o parser/testes/documentação. Não há persistência nova;
  R1-03 e seus dados não devem ser removidos.

## Aceite

- Ambos os payloads v1 aceitos e retornados sem transformação.
- Evento/tipo desconhecido, versão diferente/ausente/legada, payload inválido ou
  identificador vazio rejeitados com erro tipado sem incluir valor recebido.
- `pnpm check`, suíte `packages/contracts` e CI; registrar evidências antes de
  promover o estado.
- Nenhum teste ativa consumidor, OCR, broker ou modifica dados operacionais.

## Evidência local

- `PATH=/tmp/moura-solar-r0-bin:$PATH pnpm --filter @moura-solar/contracts test`:
  7/7 testes passaram (4 novos do parser e 3 do envelope comum).
- `PATH=/tmp/moura-solar-r0-bin:$PATH pnpm check`: passou; incluiu Prettier,
  lint, typecheck, testes (API 1.257/1.257; web 5/5; contratos 7/7) e builds.
  Diretórios locais preexistentes foram ignorados temporariamente pelo Prettier;
  `.prettierignore` foi restaurado sem diff.
- CI do PR #28, [run 80](https://github.com/rafaelm229/moura-solar/actions/runs/37852349178),
  passou: `pnpm check`, geração API sem diff, migrations, integração e E2E
  completos. O PR foi mesclado no commit
  `ecb58849d2680504a3227daf49254a9b665ecbde`.
- Integrações/E2E locais não executados: o incremento não altera API, persistência,
  worker ou UI. Migrations, integração e E2E completos passaram na CI remota.
- Nenhum deploy foi feito para R1-04: o parser não é chamado por serviços ativos,
  portanto atualizar imagem local não mudaria comportamento disponível. O Compose
  permanece no R1-03; worker/OCR continuam desativados.

## Limites e próximo recorte

O parser não verifica o envelope completo, assinatura/autenticidade, autorização,
ordenação, idempotência ou entrega. O próximo recorte de R1 precisa decidir um
consumidor/piloto que não contorne os gates da PoC de OCR e registrar transporte,
inbox e política de quarentena/replay antes de operar. Nenhum broker ou consumidor
foi escolhido por antecipação; a existência do parser não autoriza publicação ou
ativação do worker.

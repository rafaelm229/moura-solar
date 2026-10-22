# Consolidação de outubro — execução

**Data:** 22/10/2026

**Estado:** consolidação de código acompanhada no
[PR #130](https://github.com/rafaelm229/moura-solar/pull/130); sem deploy.
O estado atual e os checks do SHA final são consultados nesse PR.

**Branch:** `codex/consolidacao-main-2026-10`.

**SPECs:** SPEC-000, SPEC-003, SPEC-013, SPEC-014, SPEC-016 e SPEC-019,
com preservação dos domínios M1–M10.

## Composição e histórico

- Base `main`: `47838f74f447ecf83b5b9758bcecce2ae54df5f4`.
- PR #129 integrado em `feat/proposal-visual-clarity` por merge commit
  `57e6579eb56746bcda18e7f9110a3673ab3d3f08`, após CI completa verde.
- Integração incorporada à candidata por merge commit `bcaf6d3`, preservando
  ambos os históricos, sem reaplicar branches já absorvidas por squash.
- Branches antigas de design e o PR #127 substituído permanecem fora.
- [Inventário completo e análise anterior](analise-consolidacao-branches-2026-10-22.md).

## Correções operacionais

O Compose deixa de depender de imagens indisponíveis do Quay. MinIO e `mc` são
compilados do código oficial, respectivamente nas releases
`RELEASE.2025-10-15T17-29-55Z` e `RELEASE.2025-08-13T08-35-41Z`.
ClamAV, volumes, nomes dos serviços e configurações existentes são preservados.

A web ganha healthcheck para que `docker compose up --wait` aguarde sua
prontidão, além da API. A CI passa a construir e iniciar o mesmo Compose completo, com verificação de
prontidão da API e resposta da web antes dos testes reais de armazenamento.
O Dockerfile inclui também o manifesto do pacote histórico `energy-import-poc`
na instalação do workspace; esse pacote não ativa OCR ou serviço externo.

## Dados e compatibilidade

Nenhuma migration nova foi escrita para a consolidação; são promovidas as 12
migrations já existentes na integração. `tests/consolidation-upgrade.mjs` ensaia
o conjunto desde as migrations da `main`, com organização, usuário, perfil,
vínculo, sessão, cliente, UC, oportunidade, leitura e auditoria preexistentes.
Confere preservação dos dados, checksums, número de migrations e redeploy.
Usa somente um schema aleatório em `TEST_DATABASE_URL`, removido ao terminar.
Os ensaios já existentes cobrem banco vazio e outras fronteiras de upgrade.

A importação de contas permanece manual conforme ADR-008. Sem consumidor,
transporte, OCR, alteração de gates ou expansão de domínio nesta consolidação.

## Validação

- `pnpm install --frozen-lockfile` e `pnpm db:generate`: passaram na cópia isolada.
- `pnpm check`: passou antes do merge local e após as correções operacionais.
- Node local: 24.19.0; CI: Node 22 e PostgreSQL 17.
- Gates remotos obrigatórios: build/Compose, upgrade populado, migrations,
  integração e E2E completos. Os resultados vinculados ao SHA final estão no
  [PR #130](https://github.com/rafaelm229/moura-solar/pull/130).
- O [primeiro run](https://github.com/rafaelm229/moura-solar/actions/runs/39852958507)
  comprovou build das aplicações/MinIO/mc, criação de buckets, ClamAV saudável,
  migrations do Compose e prontidão da API. Parou no primeiro acesso à web,
  recém-iniciada. O healthcheck da web foi adicionado para eliminar essa corrida.
- Docker local não acessível à sessão sem senha administrativa. Não foram
  alteradas permissões do socket, grupos, banco ou volumes do usuário.

## Demonstração e aceite

1. Inicializar em ambiente descartável com `.env` configurado e
   `docker compose up -d --build`; conferir prontidão e conclusão de migrations.
2. Autenticar por perfis e conferir cliente/UC/oportunidade e negação de acesso
   entre organizações.
3. Upload no dossiê, scanner/quarentena, download autenticado e revisão e
   confirmação manual de conta; conferir persistência após reinício.
4. Dimensionamento, proposta/PDF/aceite e contrato/DOCX/assinado; conferir gates,
   estoque/financeiro e auditoria/outbox sem ativar consumidores.
5. Conferir jornadas nos viewports 360, 768, 1024 e 1440 px e teclado/foco.

Os E2E existentes exercitam os quatro tamanhos exigidos, incluindo dossiê;
os artefatos Playwright do run são a evidência automatizada. Não afirmar revisão
visual manual realizada nesta sessão.

## Reversão e implantação

Este trabalho consolida código no GitHub; não implanta no ambiente operacional.
Antes de um deploy, obter backup conjunto de PostgreSQL e objetos/volumes,
ensaiar restauração em instância descartável e conferir manifesto/hashes.
O banco populado sintético da CI não substitui esse ensaio de restauração.
Reverter código não desfaz migrations nem comprova compatibilidade do binário
anterior com dados novos. Preferir correção adiante; rollback de aplicação exige
ensaio específico. Não remover volumes, fazer reset ou usar `prisma db push`.

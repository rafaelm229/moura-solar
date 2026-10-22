# Análise de consolidação das branches — 22/10/2026

## Recomendação

Consolidar a linha `feat/proposal-visual-clarity` na `main`, após incorporar o PR #129 e validar uma candidata de integração com a correção operacional do MinIO. Não mesclar todas as branches individualmente. A maioria é histórico de incrementos já incorporados; o ramo antigo de design diverge da direção aprovada.

Este relatório é uma análise, não uma aprovação de release. Nenhum merge, push, exclusão de branch, migration ou deploy foi executado. As simulações gravaram apenas objetos Git em uma cópia temporária, sem mudar branch, índice ou arquivos da aplicação.

## Fotografia verificada

- Repositório: [rafaelm229/moura-solar](https://github.com/rafaelm229/moura-solar).
- Referências remotas atualizadas com `git fetch origin` nesta análise; 146 branches remotas, excluído o alias `origin/HEAD`.
- `main`: `47838f74f447ecf83b5b9758bcecce2ae54df5f4`, último commit em 02/10/2026 às 16h24, Brasília.
- Integração `feat/proposal-visual-clarity`: `da1c8de1774b98c0d294a0c0fcf76db547e792f2`, último commit em 10/10/2026 às 15h09.
- PR aberto: [#129 — fix(contracts): accept ISO end-of-day timestamps](https://github.com/rafaelm229/moura-solar/pull/129).
- Cabeça do PR #129: `6f4abfd49c561b402740684d3f3232f55538dbdc`; destino correto: `feat/proposal-visual-clarity`.
- Branch local atual: `codex/fix-minio-source-build`, derivada da `main`, com alterações não commitadas em `README.md`, `compose.yaml` e `infra/minio/Dockerfile`.
- Essa correção local ainda não foi validada com build Docker. Não deve ser confundida com uma correção já publicada no GitHub.

A consulta de PRs abertos retornou apenas o #129. A contagem de commits é evidência histórica: hashes diferentes após squash não significam necessariamente trabalho ausente.

## Classificação das 146 branches

| Classe                                                   | Quantidade | Tratamento                                           |
| -------------------------------------------------------- | ---------: | ---------------------------------------------------- |
| Ancestrais da integração, incluindo a própria integração |         36 | Já contidas; não reaplicar                           |
| Patches individuais equivalentes a commits da integração |         89 | Já integradas por conteúdo; não reaplicar            |
| Squash agregado equivalente a commit da integração       |          7 | Já integradas por conteúdo; não reaplicar            |
| Somente um merge histórico ausente                       |          1 | Não há commit não-merge pendente nesse ramo          |
| `main`, destino da promoção                              |          1 | Preservar a linhagem do destino                      |
| Design antigo supersedido                                |         10 | Preservar como histórico; excluir desta consolidação |
| PR #127 fechado e substituído pelo #128                  |          1 | Não reabrir nem reaplicar                            |
| PR #129 realmente pendente                               |          1 | Revisar e incorporar antes da promoção               |
| **Total**                                                |    **146** |                                                      |

Método: ancestralidade, comparação de `patch-id --stable` de commits não-merge e comparação do patch agregado desde o ancestral comum. Equivalência comprova incorporação histórica, não garante que alterações posteriores mantiveram cada comportamento. A aceitação funcional depende dos testes da candidata final.

### Squashes que explicam falsos pendentes

| Branch de origem                   | Commit equivalente na integração                 |
| ---------------------------------- | ------------------------------------------------ |
| `codex/poc-01-decisions`           | `295326c` — aceite de proposta na outbox         |
| `codex/r1-10-customer-created`     | `4607133` — evento de cadastro de cliente        |
| `codex/r1-44-event-contract-audit` | `5e4ebf7` — auditoria de cobertura dos contratos |
| `codex/r1-60-evidence-clean`       | `da1c8de` — evidências R1-60, PR #128            |
| `fix/lote-0-baseline-uc`           | `d8c2638` — vínculos de UC/oportunidade          |
| `fix/lote-4-dossie-persistencia`   | `30620f2` — armazenamento/autorização do dossiê  |
| `feat/lote-5-poc-benchmark`        | `cf82102` — scaffolding histórico da PoC         |

O [PR #127](https://github.com/rafaelm229/moura-solar/pull/127) está fechado sem merge. Foi substituído pelo [PR #128](https://github.com/rafaelm229/moura-solar/pull/128), já incorporado. Mesclar sua branch antiga poderia reintroduzir uma versão documental substituída.

## Relação entre main e integração

`git rev-list --left-right --count origin/main...origin/feat/proposal-visual-clarity` retornou **1 / 176**: um commit exclusivo da `main` e 176 exclusivos da integração, contando merges.

O commit exclusivo da `main` é o merge `47838f7`, do PR #2 de documentação. O commit documental subjacente `631104f` já está na integração. A simulação confirma que o merge preserva seu conteúdo sem gerar diferença adicional na árvore.

Diferença entre as árvores atuais: **368 arquivos alterados, 45.156 linhas adicionadas e 4.942 removidas**, além de imagens binárias. A promoção reúne várias entregas, mesmo com um único PR aberto.

Principais áreas afetadas:

- API: comercial, consumo/dimensionamento, propostas, contratos, identidade, dossiê e importação manual.
- Web: atividades, clientes, oportunidades, propostas, contratos, estoque, financeiro e telas de revisão documental.
- Dados: dossiê/armazenamento, histórico de consumo, intake/revisão manual e outboxes.
- Contratos: envelopes versionados, correlação, eventos de domínio e OpenAPI/client gerado.
- Operação: scanner ClamAV, backend S3 explícito, Poppler, testes de migrations, integração e E2E ampliados.

## Simulações de merge

Executadas com `git merge-tree --write-tree` em clone temporário compartilhando apenas os objetos locais. Não houve checkout ou merge no repositório de trabalho.

| Combinação                              | Resultado        | Árvore resultante                          |
| --------------------------------------- | ---------------- | ------------------------------------------ |
| `main` + integração atual               | Sem conflitos    | `c72788a0a47803f3f7f4a93d63de1122dd0ea481` |
| Integração atual + cabeça do PR #129    | Sem conflitos    | `351bc1bff0dd5724b2e489837a84a119ef822816` |
| `main` + cabeça do PR #129              | Sem conflitos    | `351bc1bff0dd5724b2e489837a84a119ef822816` |
| Integração atual + design escuro antigo | **26 conflitos** | Não candidata                              |

A primeira árvore é exatamente a árvore atual da integração. A segunda e a terceira coincidem e incluem o incremento #129. Estes resultados valem para os SHAs acima; precisam ser refeitos se as pontas mudarem.

A ausência de conflito textual não comprova compatibilidade de dados, contratos, autorização ou operação.

## Branches antigas de design

Preservar sem integrar nesta rodada:

- `backup/main-dark-antigo`;
- `docs/spec-003-design-v2`;
- `feat/design-system-lote-1-tokens-primitives` até `feat/design-system-lote-8-dashboard`.

`backup/main-dark-antigo` e `feat/design-system-lote-8-dashboard` apontam para `f57162e`, de 01/10/2026. São a mesma ponta histórica.

A SPEC-003 vigente na integração e a decisão de 07/10 mantêm Material Design adaptado à Moura Solar, sem restaurar automaticamente tema escuro obrigatório ou os arquivos daquele experimento. O ramo antigo modifica autenticação, telas e contratos de teste, portanto seu merge não seria apenas uma troca de aparência.

Os 26 conflitos simulados atingem autenticação, atividades, clientes, oportunidades, contratos, catálogo, consumo, dimensionamento, financeiro, workspace, propostas, nove evidências PNG, cinco arquivos da SPEC-003 e E2E de contrato. Qualquer reaproveitamento pontual deve ser um incremento próprio, com comparação funcional, sem merge integral desse histórico.

## PR #129 e evidências de testes

O PR altera a validação do envelope para aceitar fim de dia ISO `24:00:00`, mantendo rejeição de datas impossíveis, frações não zero, segundos/minutos não zero e offset inválido. Não adiciona migration ou consumidor.

- GitHub: [Platform checks, run 38074838184](https://github.com/rafaelm229/moura-solar/actions/runs/38074838184), associado à cabeça `6f4abfd`, concluído com **success**.
- A definição de CI nesse SHA inclui `pnpm check`, regeneração do cliente/OpenAPI com verificação de diff, migrations, integração e E2E com PostgreSQL e armazenamento/scanner reais.
- Local nesta análise: fontes do pacote e da API extraídos do mesmo SHA para uma pasta temporária; compilação com o `tsconfig` do pacote e TypeScript instalado; suíte existente de contratos: **85 testes passaram, zero falhas**, nos 11 arquivos de teste.
- Ambiente local desses testes: Node 24.19.0; a CI utiliza Node 22. A validação local complementar não substitui a CI.
- A consulta de runs de PR para a cabeça da integração `da1c8de` não retornou runs. Isso não prova ausência de toda validação: o conector filtra runs disparados por PR e o #128 foi documental. Usar o run verde do #129 como evidência do conjunto que ele contém, sem atribuí-lo a outro SHA.
- Não executei `pnpm check`, migrations, integração ou E2E da candidata completa nesta análise. Não há validação de release final ainda.

## Riscos e condições antes do merge final

### 1. Banco: 12 migrations novas

As migrations já existentes na `main` não foram editadas no diff observado. Os 12 arquivos seguintes são adicionados:

1. `20261003000100_dossier_and_storage`;
2. `20261003000200_dossier_integrity`;
3. `20261004000100_energy_reading_corrections`;
4. `20261005000100_energy_import_intake`;
5. `20261005000200_energy_import_reviews`;
6. `20261005000300_energy_import_lifecycle_commands`;
7. `20261005000400_extraction_attempts_and_outbox_leases`;
8. `20261005000500_attempt_correlation_recovery`;
9. `20261005000600_module_stock_availability_permission`;
10. `20261008000100_import_outbox_correlation`;
11. `20261008000200_import_outbox_schema_version`;
12. `20261009000100_integration_outbox`.

Há novas tabelas, referências, índices únicos, triggers de contexto organizacional/imutabilidade, colunas e uma permissão. A migration de integridade também substitui uma FK de representantes para aplicar `ON DELETE RESTRICT`. Portanto, o risco não se limita à criação de tabelas.

Condições: executar em banco vazio e em uma cópia populada da versão da `main`; conferir `_prisma_migrations`, vínculos UC/oportunidade, documentos/contratos e leituras existentes. Usar somente `prisma migrate deploy` no procedimento de promoção. Não executar testes contra o banco operacional.

Antes de qualquer deploy com migration, preparar backup PostgreSQL e dos objetos/volumes de arquivos, com restauração ensaiada. Reverter somente o commit da aplicação não desfaz migrations ou escritas novas; compatibilidade do binário antigo precisa de verificação explícita. Não remover volumes nem resetar bancos.

### 2. MinIO/ClamAV e configuração

O Compose da integração ainda usa `quay.io/minio/minio:latest` e `quay.io/minio/mc:latest`, que falharam no ambiente do usuário. A CI já usa `ghcr.io/coollabsio/minio` fixado pelo digest `sha256:69b55a1c1c5dc285ce04db96689f5b2102317fc77a50680a1874ca6efd1c87f9` e ClamAV 1.4. Assim, CI verde não comprova que o Compose atual consegue iniciar.

A correção local em `codex/fix-minio-source-build` substitui as duas imagens por build do código oficial com versões fixas, mas foi criada a partir da `main`, sem o ClamAV/configuração novos da integração. Incorporar apenas seus trechos pertinentes sobre a candidata consolidada; não substituir o Compose novo pelo arquivo antigo inteiro. Escolher e validar uma estratégia coerente entre desenvolvimento e CI antes de promovê-la.

Aceite operacional: build do servidor e `mc`; criação dos buckets; API pronta; scanner disponível; upload, quarentena, download autenticado e leitura de documento legado. `docker compose config` não substitui esse teste.

Novas configurações: `S3_BACKEND=MINIO`, `CLAMD_HOST` e `CLAMD_PORT`. Sem scanner, os arquivos ficam em quarentena conforme documentação. O Compose não condiciona o início da API à prontidão do scanner: testar inicialização lenta e recuperação. Não desativar quarentena para contornar a inicialização.

### 3. Escopo e decisões vigentes

A ADR-008 mantém intake, transcrição, revisão e confirmação manuais das contas. O scaffolding histórico da PoC permanece por rastreabilidade; não ativar OCR, Azure, polling ou consumidores ao consolidar. `apps/worker/src/main.ts` continua declarando consumidores inativos.

Preservar permissões na API, contexto organizacional, snapshots, auditoria, idempotência e concorrência. Testar autorização negativa, conflitos e persistência real nos domínios alterados. Não declarar extração de microserviços concluída: a arquitetura operacional continua um monólito modular.

### 4. Evidências e governança

Há registros documentais de `pnpm check` bloqueado por sete arquivos locais não rastreados em trabalhos anteriores. Isso não permite ignorar falhas da candidata. Executar em checkout limpo, preservar arquivos do usuário e registrar o resultado real.

Proteções da `main`, reviews obrigatórios, regras de merge e ambiente de produção não foram auditados nesta análise. Conferir antes da operação remota. Não há autorização implícita neste relatório para deploy, exclusão de branches ou mudança de políticas de proteção.

## Ordem proposta de execução

1. **Fixar a fotografia:** atualizar refs novamente e registrar os SHAs; preservar a correção local do MinIO em sua branch, sem descartar alterações. Não trabalhar na `main`.
2. **Concluir o incremento pequeno:** revisar e integrar o PR #129 em `feat/proposal-visual-clarity`, mantendo o destino original e conferindo a CI/reviews exigidos. Atualizar os registros R1-61 com evidência real.
3. **Criar candidata de consolidação a partir da main:** por exemplo, `codex/consolidacao-main-2026-10`. Mesclar a integração nessa candidata com um commit de merge que preserve a ancestralidade. Não squashar novamente os 176 commits acumulados; isso dificultaria a identificação do histórico consolidado.
4. **Corrigir operação em incremento separado:** transportar apenas a correção necessária de MinIO para a candidata, preservando o ClamAV e demais configurações novas. Validar build/Compose e alinhar a estratégia de imagem com a CI. Registrar essa correção separadamente.
5. **Validar a candidata limpa:** executar todos os comandos e cenários abaixo; corrigir falhas e repetir somente os checks afetados e a validação final pertinente. Criar evidências vinculadas ao SHA final.
6. **Abrir PR único de promoção para main:** descrever dossiê, importação manual, outbox, compatibilidade, 12 migrations, operação e rollback. Vincular SPEC-003/013/014/016/019 e demais domínios afetados. Anexar roteiro e evidências. Revisar o diff completo.
7. **Integrar após aprovação da candidata:** preferir merge commit no PR de promoção para conservar a linhagem. Não alterar configurações de proteção apenas para permitir a estratégia. Se houver exigência de histórico linear, definir a estratégia com o mantenedor antes de executar.
8. **Deploy é uma etapa posterior:** seguir backup, ensaio e implantação separados. Após estabilização, avaliar limpeza das branches já integradas; preservar o backup e as branches supersedidas até decisão explícita.

Os nomes acima são propostos; nenhuma candidata ou PR de promoção foi criado nesta análise.

## Matriz mínima de validação da candidata

| Área            | Comando/cenário                                           | Evidência exigida                                              |
| --------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| Dependências    | `pnpm install --frozen-lockfile`; `pnpm db:generate`      | Checkout limpo, lockfile preservado                            |
| Qualidade       | `pnpm check`                                              | Formatação, lint, tipos, testes e build aprovados no SHA final |
| API             | `pnpm api:generate`; diff dos arquivos gerados            | OpenAPI e cliente coerentes, sem diff inesperado               |
| Banco           | `pnpm test:migrations` e ensaio main populada → candidata | 12 migrations aplicadas e dados antigos preservados            |
| Integração      | `pnpm test:integration` com banco/S3/scanner de teste     | Domínios, durabilidade, rollback e permissões aprovados        |
| E2E             | `pnpm test:e2e`                                           | Jornadas críticas completas                                    |
| Layout          | 360, 768, 1024 e 1440 px; teclado/foco                    | Evidências atuais conforme SPEC-003                            |
| Operação        | Build/Compose, health, buckets, ClamAV                    | Inicialização a frio e recuperação comprovadas                 |
| Documentos      | Upload, quarentena, download autorizado, legado           | Objetos persistentes e acesso negado entre organizações        |
| Regras críticas | Versões, conflitos, repetição de comandos e gates         | Sem dupla mutação, perda silenciosa ou transição inválida      |
| Reversão        | Restauração de backup/objetos e compatibilidade           | Roteiro ensaiado em ambiente descartável                       |

Roteiro de demonstração: login por perfis; cliente/UC/oportunidade; upload no dossiê; revisão e confirmação manual de conta; dimensionamento; proposta/PDF/aceite; contrato/DOCX/assinado; estoque e financeiro; negação entre organizações; consulta de auditoria/outbox sem ativar consumidores.

## Critério para prosseguir

A consolidação é **tecnicamente viável por merge sem conflito textual nos SHAs analisados**. A promoção para `main` ainda depende da candidata com MinIO operacional, testes completos, ensaio de migrations e revisão. Não há motivo para mesclar 146 branches uma a uma.

## Inventário completo

A classificação abaixo é relativa a `feat/proposal-visual-clarity@da1c8de`. SHA é a ponta remota observada; não é data de criação da branch.

| Branch remota                                         | SHA        | Classificação                          |
| ----------------------------------------------------- | ---------- | -------------------------------------- |
| `backup/main-dark-antigo`                             | `f57162e9` | Histórico de design supersedido        |
| `codex/manual-import-decision`                        | `197302c0` | Patches individuais já integrados      |
| `codex/poc-01-decisions`                              | `6ebcc164` | Squash agregado já integrado           |
| `codex/r0-baseline`                                   | `224a77ea` | Ancestral / já contida                 |
| `codex/r1-02-local-deploy-docs`                       | `c2a4c564` | Ancestral / já contida                 |
| `codex/r1-03-local-deployment-record`                 | `fe30457b` | Ancestral / já contida                 |
| `codex/r1-04-import-event-decoder`                    | `4e2443b5` | Ancestral / já contida                 |
| `codex/r1-04-record-merge`                            | `04512e8e` | Ancestral / já contida                 |
| `codex/r1-05-integration-inventory`                   | `f44a9096` | Ancestral / já contida                 |
| `codex/r1-06-transport-proposal`                      | `fe123d9f` | Ancestral / já contida                 |
| `codex/r1-07-import-event-guard`                      | `f8e584b4` | Patches individuais já integrados      |
| `codex/r1-07-merge-record`                            | `0ca30ea2` | Patches individuais já integrados      |
| `codex/r1-10-customer-created`                        | `9c8d0d6c` | Squash agregado já integrado           |
| `codex/r1-11-opportunity-created`                     | `b4ba9517` | Patches individuais já integrados      |
| `codex/r1-12-utility-unit-created`                    | `c9642205` | Patches individuais já integrados      |
| `codex/r1-12-validation-record`                       | `95d6d7d1` | Patches individuais já integrados      |
| `codex/r1-13-proposal-created`                        | `557a3e55` | Patches individuais já integrados      |
| `codex/r1-14-proposal-delivered`                      | `c6aa2d40` | Patches individuais já integrados      |
| `codex/r1-15-proposal-version-created`                | `5471648d` | Patches individuais já integrados      |
| `codex/r1-16-opportunity-qualified`                   | `dcd999c2` | Patches individuais já integrados      |
| `codex/r1-17-opportunity-lost`                        | `676cae5c` | Patches individuais já integrados      |
| `codex/r1-18-merge-record`                            | `8e8f0d5f` | Patches individuais já integrados      |
| `codex/r1-18-opportunity-reopened`                    | `1f0f90e8` | Patches individuais já integrados      |
| `codex/r1-19-merge-record`                            | `3f771edf` | Patches individuais já integrados      |
| `codex/r1-19-proposal-rejected`                       | `f8acad07` | Patches individuais já integrados      |
| `codex/r1-20-customer-lifecycle-events`               | `fde3f15c` | Patches individuais já integrados      |
| `codex/r1-21-consolidation-record`                    | `b2b8f3ea` | Patches individuais já integrados      |
| `codex/r1-21-utility-unit-updated`                    | `d0b3b48c` | Patches individuais já integrados      |
| `codex/r1-22-consolidation-record`                    | `a94e5dcd` | Patches individuais já integrados      |
| `codex/r1-22-customer-updated`                        | `227fd806` | Patches individuais já integrados      |
| `codex/r1-23-consolidation-record`                    | `a027ff43` | Patches individuais já integrados      |
| `codex/r1-23-opportunity-updated`                     | `ea31a423` | Patches individuais já integrados      |
| `codex/r1-24-activity-created`                        | `80dc867b` | Patches individuais já integrados      |
| `codex/r1-24-activity-created-docs`                   | `771efb84` | Patches individuais já integrados      |
| `codex/r1-25-activity-canceled`                       | `f7d7ffa2` | Patches individuais já integrados      |
| `codex/r1-25-activity-canceled-docs`                  | `178d3df7` | Patches individuais já integrados      |
| `codex/r1-26-activity-completed`                      | `5b97536c` | Patches individuais já integrados      |
| `codex/r1-26-documentation`                           | `281ce737` | Patches individuais já integrados      |
| `codex/r1-27-activity-rescheduled`                    | `3c9076e3` | Patches individuais já integrados      |
| `codex/r1-27-documentation`                           | `a60a9b54` | Patches individuais já integrados      |
| `codex/r1-28-documentation`                           | `0f164c42` | Patches individuais já integrados      |
| `codex/r1-28-opportunity-first-activity-event`        | `0743c87a` | Patches individuais já integrados      |
| `codex/r1-29-merge-record`                            | `0c45e350` | Patches individuais já integrados      |
| `codex/r1-29-qualification-followup-event`            | `e6032e7d` | Patches individuais já integrados      |
| `codex/r1-30-completion-followup-event`               | `b1111d9e` | Patches individuais já integrados      |
| `codex/r1-30-merge-record`                            | `edcde5eb` | Patches individuais já integrados      |
| `codex/r1-31-evidence`                                | `7173bdf8` | Patches individuais já integrados      |
| `codex/r1-31-proposal-delivery-activity-event`        | `c32c0793` | Patches individuais já integrados      |
| `codex/r1-32-evidence`                                | `a88de47e` | Patches individuais já integrados      |
| `codex/r1-32-proposal-acceptance-activity-event`      | `b6174d53` | Patches individuais já integrados      |
| `codex/r1-33-contract-activity-event`                 | `f4ebe491` | Patches individuais já integrados      |
| `codex/r1-33-evidence`                                | `a8416e2e` | Ancestral / já contida                 |
| `codex/r1-34-contract-review-activity-event`          | `b9b59f6a` | Ancestral / já contida                 |
| `codex/r1-34-merge-record`                            | `856e0de0` | Ancestral / já contida                 |
| `codex/r1-35-catalog-events`                          | `1aae57c7` | Ancestral / já contida                 |
| `codex/r1-35-postmerge-docs`                          | `4f7c3fbe` | Ancestral / já contida                 |
| `codex/r1-36-contract-delivery-event`                 | `5a4a0572` | Ancestral / já contida                 |
| `codex/r1-36-postmerge-docs`                          | `0ec82c04` | Ancestral / já contida                 |
| `codex/r1-37-contract-canceled-event`                 | `9521305b` | Ancestral / já contida                 |
| `codex/r1-37-postmerge-docs`                          | `2812cb60` | Ancestral / já contida                 |
| `codex/r1-38-contract-amendment-event`                | `b223b352` | Ancestral / já contida                 |
| `codex/r1-38-postmerge-docs`                          | `7ed39b4e` | Ancestral / já contida                 |
| `codex/r1-39-contract-signed-review-event`            | `d5a363ac` | Ancestral / já contida                 |
| `codex/r1-39-postmerge-docs`                          | `9c1f3b94` | Ancestral / já contida                 |
| `codex/r1-40-consolidation-docs`                      | `4106af67` | Ancestral / já contida                 |
| `codex/r1-40-contract-signed-upload-event`            | `36e5897b` | Ancestral / já contida                 |
| `codex/r1-41-consolidation-docs`                      | `b06bf351` | Ancestral / já contida                 |
| `codex/r1-41-outbox-contract-created`                 | `f6b7c8dc` | Ancestral / já contida                 |
| `codex/r1-42-consolidation-record`                    | `81b0d50c` | Patches individuais já integrados      |
| `codex/r1-42-outbox-contract-review`                  | `22652311` | Patches individuais já integrados      |
| `codex/r1-43-consolidation-record`                    | `f759a324` | Patches individuais já integrados      |
| `codex/r1-43-outbox-restart-durability`               | `174c4b96` | Patches individuais já integrados      |
| `codex/r1-44-consolidation-record`                    | `78092f11` | Patches individuais já integrados      |
| `codex/r1-44-event-contract-audit`                    | `8eb57685` | Squash agregado já integrado           |
| `codex/r1-45-manual-import-restart`                   | `7e9f9026` | Patches individuais já integrados      |
| `codex/r1-46-ci-merge-evidence`                       | `1bdadadf` | Patches individuais já integrados      |
| `codex/r1-46-manual-import-atomicity`                 | `c44db193` | Patches individuais já integrados      |
| `codex/r1-47-ci-merge-evidence`                       | `25093ce9` | Patches individuais já integrados      |
| `codex/r1-47-event-payload-audit`                     | `85d7eefa` | Patches individuais já integrados      |
| `codex/r1-48-ci-merge-evidence`                       | `c9a590c3` | Patches individuais já integrados      |
| `codex/r1-48-request-correlation-validation`          | `0dfeedda` | Patches individuais já integrados      |
| `codex/r1-49-ci-merge-evidence`                       | `f6b3d60f` | Patches individuais já integrados      |
| `codex/r1-49-request-log-redaction-test`              | `39ade9e0` | Patches individuais já integrados      |
| `codex/r1-50-audit-log-correlation`                   | `acf16de3` | Patches individuais já integrados      |
| `codex/r1-51-ci-evidence`                             | `1dbe545a` | Patches individuais já integrados      |
| `codex/r1-51-failed-login-correlation`                | `a6c2070d` | Patches individuais já integrados      |
| `codex/r1-52-ci-evidence`                             | `ad163357` | Patches individuais já integrados      |
| `codex/r1-52-contract-parity`                         | `dd08fff4` | Patches individuais já integrados      |
| `codex/r1-53-ci-evidence`                             | `b5b91864` | Patches individuais já integrados      |
| `codex/r1-53-event-metadata`                          | `1f4ca77a` | Patches individuais já integrados      |
| `codex/r1-54-ci-evidence`                             | `d9727689` | Patches individuais já integrados      |
| `codex/r1-54-contract-version`                        | `57d38a18` | Patches individuais já integrados      |
| `codex/r1-55-ci-evidence`                             | `d8e1390a` | Patches individuais já integrados      |
| `codex/r1-55-correlation-type`                        | `c8fafb56` | Patches individuais já integrados      |
| `codex/r1-56-ci-evidence`                             | `b2cb1e13` | Patches individuais já integrados      |
| `codex/r1-56-envelope-required-fields`                | `a1613dbc` | Patches individuais já integrados      |
| `codex/r1-57-ci-evidence`                             | `d4662de5` | Patches individuais já integrados      |
| `codex/r1-57-envelope-optional-fields`                | `945552e1` | Patches individuais já integrados      |
| `codex/r1-58-ci-evidence`                             | `08e93963` | Patches individuais já integrados      |
| `codex/r1-58-payload-object`                          | `a6af27af` | Patches individuais já integrados      |
| `codex/r1-59-ci-evidence`                             | `34609d73` | Patches individuais já integrados      |
| `codex/r1-59-stable-payload-assertion`                | `9734eb55` | Patches individuais já integrados      |
| `codex/r1-60-ci-evidence`                             | `dd8e7546` | PR #127 fechado; substituído pelo #128 |
| `codex/r1-60-evidence-clean`                          | `957eb4ba` | Squash agregado já integrado           |
| `codex/r1-60-strict-calendar-timestamp`               | `e523fb25` | Patches individuais já integrados      |
| `codex/r1-61-timestamp-offset-boundaries`             | `6f4abfd4` | Pendente: PR #129                      |
| `codex/r1-import-correlation`                         | `c2e3e0cd` | Ancestral / já contida                 |
| `codex/r1-import-event-versioning`                    | `344010dd` | Ancestral / já contida                 |
| `codex/r1-integration-contracts`                      | `dfdb82ce` | Ancestral / já contida                 |
| `docs/evolucao-ux-documentos-contas`                  | `631104fe` | Ancestral / já contida                 |
| `docs/spec-003-design-v2`                             | `7c63ee74` | Histórico de design supersedido        |
| `feat/design-system-lote-1-tokens-primitives`         | `3ff9320c` | Histórico de design supersedido        |
| `feat/design-system-lote-2-shell-routes`              | `2ccfd695` | Histórico de design supersedido        |
| `feat/design-system-lote-3-m1-identity`               | `38d170d1` | Histórico de design supersedido        |
| `feat/design-system-lote-4-m2-commercial`             | `e5ca188d` | Histórico de design supersedido        |
| `feat/design-system-lote-5-m3-engineering`            | `7557a2e0` | Histórico de design supersedido        |
| `feat/design-system-lote-6-m4-m5-proposals-contracts` | `6478d742` | Histórico de design supersedido        |
| `feat/design-system-lote-7-m6-financial`              | `6befa69a` | Histórico de design supersedido        |
| `feat/design-system-lote-8-dashboard`                 | `f57162e9` | Histórico de design supersedido        |
| `feat/evolucao-lote-4-dossie-armazenamento`           | `18a3c1a8` | Somente merge histórico pendente       |
| `feat/lote-5-poc-benchmark`                           | `0ba2012d` | Squash agregado já integrado           |
| `feat/lote-6-attempt-lifecycle`                       | `e7170b04` | Patches individuais já integrados      |
| `feat/lote-6-attempt-recovery`                        | `832f0f61` | Patches individuais já integrados      |
| `feat/lote-6-candidate-provenance`                    | `15c25b3a` | Patches individuais já integrados      |
| `feat/lote-6-candidate-selection`                     | `94ae9d47` | Patches individuais já integrados      |
| `feat/lote-6-confirm-create-utility-unit`             | `ce7d842a` | Patches individuais já integrados      |
| `feat/lote-6-detect-duplicate-bills`                  | `27786c05` | Patches individuais já integrados      |
| `feat/lote-6-durable-attempts`                        | `68416acf` | Patches individuais já integrados      |
| `feat/lote-6-energy-import-foundation`                | `54576e24` | Patches individuais já integrados      |
| `feat/lote-6-import-review-confirm`                   | `a95efd1e` | Patches individuais já integrados      |
| `feat/lote-6-result-fencing`                          | `36af3c59` | Patches individuais já integrados      |
| `feat/lote-6-review-ui`                               | `8bc8f1de` | Patches individuais já integrados      |
| `feat/m1-identidade-permissoes`                       | `064bd4dd` | Ancestral / já contida                 |
| `feat/m2-clientes-oportunidades`                      | `5b74e102` | Ancestral / já contida                 |
| `feat/m3-dimensionamento-custos`                      | `2d8b7953` | Ancestral / já contida                 |
| `feat/m4-propostas-pdf`                               | `ff3484ef` | Ancestral / já contida                 |
| `feat/m5-contratos-documentos`                        | `417cd396` | Ancestral / já contida                 |
| `feat/m6-financeiro-parcelas-recebimentos`            | `9319a30f` | Ancestral / já contida                 |
| `feat/proposal-visual-clarity`                        | `da1c8de1` | Ancestral / já contida                 |
| `fix/design-module-catalog-stock-pr`                  | `969f72a1` | Ancestral / já contida                 |
| `fix/lote-0-baseline-uc`                              | `d2b094fd` | Squash agregado já integrado           |
| `fix/lote-0-energy-reading-corrections`               | `2adc8a08` | Patches individuais já integrados      |
| `fix/lote-0-gate-contractual`                         | `e1d525bf` | Patches individuais já integrados      |
| `fix/lote-4-dossie-persistencia`                      | `657611fe` | Squash agregado já integrado           |
| `fix/lote-6-refresh-created-unit`                     | `6df0f91c` | Patches individuais já integrados      |
| `main`                                                | `47838f74` | Destino main; conteúdo já incluído     |

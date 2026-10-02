# Plano de evolução — UX, documentos e contas de energia

**Status:** Proposta para revisão

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo aprovado; contratos detalhados e aparência final sujeitos à revisão humana.

## Base e limites desta entrega

Repositório rafaelm229/moura-solar, pasta `/home/rafael/.gemini/antigravity/scratch/moura-solar`. Inspeção em 02/10/2026: branch inicial main limpa, HEAD e origin/main locais em `a197c80b2c6f36cf238d9b1101088b87413307d9`. Consulta `git ls-remote origin refs/heads/main` confirmou o mesmo SHA remoto. A primeira consulta SSH falhou no ambiente restrito e a consulta autorizada funcionou. Branch criada a partir dessa main: `docs/evolucao-ux-documentos-contas`.

Nenhum reset, stash, descarte ou sobrescrita de trabalho preexistente. Escopo desta tarefa exclusivamente documental, sem push, PR ou merge. Instrução específica prevalece sobre regra geral de PR do AGENTS.md. Novas SPECs/ADRs são propostas, sem implementação ou aprovação visual implícita. README/plano anteriores preservam declarações históricas de entrega; não foram revalidadas como aprovação funcional atual.

## Inspeção e achados revalidados

Lidos AGENTS.md, README, SPEC-000 a SPEC-012, máquina de estados/gates, modelos/API pertinentes, ADR-001/002, Definition of Done e plano anterior. Inspecionados Workspace, cliente de identidade, telas comerciais/consumo e módulos operacionais, controllers/services de domínio, schema Prisma, StorageService, worker, testes/Playwright e CI. Referências abaixo são caminhos relativos à raiz e símbolos/linhas na base analisada. Diferença fcb91f4..a197c80 afeta apenas .npmrc, Dockerfile e pnpm-workspace.yaml; achados abaixo foram também verificados diretamente, não deduzidos apenas do diff.

| ID   | Fato observado e evidência                                                                                                                                     | Risco (não execução comprovada)                                                              | Proposta/lote                                                                     |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| A-01 | `apps/web/src/features/identity/workspace.tsx:71`: tab local; app/page.tsx monta Workspace                                                                     | Sem deep link por entidade/aba e histórico real                                              | Rotas e shell gradual, lote 3                                                     |
| A-02 | Mesmo arquivo:71/104 inicia e reseta em sessions; destinations inclui Minhas sessões primeiro                                                                  | Entrada pouco orientada ao trabalho                                                          | Início e menu conta, lote 3                                                       |
| A-03 | Mesmo arquivo:184 usa navigation.slice(0,3); pessoas/equipes precedem comercial quando autorizadas                                                             | Atalhos administrativos por ordem, não por perfil                                            | Prioridades explícitas, lote 3                                                    |
| A-04 | `features/financial/financial.tsx:592` tem emoji; features/design/consumption.tsx tem avisos com emojis; módulos usam style inline                             | Inconsistência e migração CSS arriscada                                                      | Ícones locais/componentes compatíveis, lotes 2/7                                  |
| A-05 | Financeiro 2.599 linhas; engenharia 1.923 linhas na base                                                                                                       | Mudança transversal difícil de revisar                                                       | Decompor apenas responsabilidade afetada, lotes 2/7                               |
| A-06 | Prisma ProposalDocument:731 e ContractDocument:844 mantêm próprios objetos/hashes; não há modelo de dossiê geral                                               | Duplicação se novo módulo copiar documentos                                                  | Projeção tipada preservando dono, lote 4                                          |
| A-07 | Prisma WorkOrderChecklistItem:1585 photoUrl; engineering.service.ts:693 aceita valor textual                                                                   | URL não prova armazenamento/autorização/durabilidade                                         | Inventário e vínculo de versão verificada, lote 4; gates tratados separadamente   |
| A-08 | features/design/consumption.tsx: formulários manuais; API design.service.ts createOrUpdateReading faz upsert por UC/mês                                        | Sobrescrita de leitura; consumerClass mapeia todo não B1 para COMMERCIAL na UI               | Estabilização própria lote 0; confirmação revisada lote 6                         |
| A-09 | consumption.tsx createUnitMutation faz POST UC seguido de PATCH oportunidade                                                                                   | Falha entre requests deixa UC sem vínculo                                                    | Caso de uso transacional de confirmação, lote 6; recuperar fluxo manual no lote 0 |
| A-10 | commercial.service.ts:685 valida UC só por organização ao criar; updateOpportunity:755–797 atribui utilityUnitId sem validar proprietário; FK Prisma é simples | UC de outro cliente, e update sem igualdade explícita de tenant da UC                        | Reproduzir com testes negativos e corrigir em incremento de domínio, lote 0       |
| A-11 | proposal/storage.service.ts:94–181 tenta S3 e grava disco retornando mesmo bucket/key; metadados não têm backend                                               | Sucesso aparente e perda após troca de instância/backup incompleto                           | Backend explícito, estados e reconciliação, lote 4; inventário de risco lote 0    |
| A-12 | tests/e2e contém identity/commercial/design/proposal/contract; existem integrações financial/inventory/engineering/after-sales/automations                     | E2E não dedicado a M6–M10; existência não prova passing ou isolamento completo               | Baseline integrado e novos E2E por módulo, lotes 0/7                              |
| A-13 | CI executa pnpm check antes de migrations/integrações/E2E; consulta de runs do commit via conector retornou lista vazia restrita a PR                          | Não é evidência do último CI de push; falha histórica não deve ser atribuída ao HEAD sem log | Registrar leitura local de formatação; capturar execução CI completa no lote 0    |
| A-14 | SPEC-003 atual 0.1.0 clara; histórico 0.2.0 f03e1fa/7c63ee7 escuro                                                                                             | Restaurar redesign abandonado por erro de referência                                         | 0.3.0 clara como proposta, histórico preservado                                   |
| A-15 | SPEC-001 responsabilidades usa Gate C para proposta; contract.service.ts:1234 chama CONTRACT de Gate C                                                         | Rótulo ambíguo orienta ação errada                                                           | Dicionário operacional por código real, lote 0/1; sem trocar gate por estética    |
| A-16 | apps/worker/src/main.ts declara nenhum consumidor habilitado                                                                                                   | PoC confundida com pipeline durável pronto                                                   | Outbox/worker/adapter ainda propostos, lotes 5/6                                  |

A validação estática não demonstra exploração, perda real ou comportamento em produção. A-10/A-11 são riscos concretos sustentados pelo código e exigem testes de reprodução. Problemas não foram corrigidos nesta tarefa.

## Reaproveitamento e fronteiras

Manter NestJS modular/PostgreSQL/Prisma, cookies e refresh coordenado em identity/client.ts, cliente OpenAPI, QueryClient estável, permissões contextuais, transações/auditoria existentes e testes. Reutilizar Customer, UtilityUnit, EnergyReading, Opportunity, OperationalProject, WorkOrder, ProjectGate, ProposalDocument e ContractDocument. Consumo e snapshots não ganham fonte paralela. Outbox/worker são exigências propostas; não declarar o worker atual pronto para OCR. Dossiê referencia domínios; apresentação da jornada não decide gates.

## Lotes incrementais

| Lote                             | Dependências e escopo                                                                                                                       | Testes e evidências de saída                                                                                                                      | Rollback                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Estabilização/baseline       | Base limpa M1–M10; reproduzir A-08/09/10/11/15, inventariar arquivos reais e endpoints; corrigir falhas comprovadas em incrementos próprios | pnpm check, migrations, integração e E2E existentes; negativos tenant/cliente, concorrência; matriz de capacidades; baseline visual/PDF e logs CI | Reverter incremento isolado, preservar dados; correção de segurança exige plano sem reintroduzir exposição; nunca reset/volumes                |
| 1 — Aprovação documental/pilotos | Revisão SPEC-003/013/014/015 e ADRs; previews cliente/oportunidade/instalação com fixtures                                                  | T-UX-01/02/05 e aprovação humana mobile/tablet/desktop registrada                                                                                 | Descartar somente proposta visual não aprovada, manter versão anterior operacional; sem mutações de domínio                                    |
| 2 — Ícones/componentes           | Lote 1; SVGs locais, tokens aliases, componentes afetados compatíveis                                                                       | Acessibilidade, estados, screenshots e licença; payloads/domínio inalterados                                                                      | Flag/componente anterior por superfície; não troca global de CSS                                                                               |
| 3 — Navegação/rotas              | Lotes 0/2; shell persistente, rotas, conta/configurações e mobile por perfil                                                                | T-UX-03/04, dois dispositivos, retorno login e formulários sujos; inventário sem perdas                                                           | Adaptador mantém deep links publicados e contexto na superfície antiga; sessão/cache preservados                                               |
| 4 — Armazenamento/dossiê         | Lotes 0/1; dividir 4A persistência/migração e 4B UI compatível, nunca misturar redesign com banco                                           | T-DOC-01 a 10; hash/restauração/reconciliação, permissões e falhas reais de backend                                                               | Desabilitar novos uploads/UI, manter leitura legada verificada; migrations aditivas e objetos preservados, sem downgrade destrutivo            |
| 5 — PoC extração                 | Lote 1 e contrato documental definido; corpus autorizado/isolado, orçamento aprovado, adapters avaliados                                    | Relatório por campo/distribuidora, idiomas/versões, privacidade, custo/latência; nenhuma aplicação automática                                     | Encerrar experimento, revogar acesso externo e expurgar temporários conforme política; manual continua                                         |
| 6 — Importação integrada         | Lotes 0/4/5; separar 6A pipeline/banco/confirmação e 6B UI de revisão; fonte EnergyReading única                                            | T-IMP-01 a 12; crash/retry, conflito, idempotência, isolamento, snapshots e dois dispositivos                                                     | Desativar novos jobs/confirmações, drenar/cancelar fila com estado durável; manter histórico/recibos; corrigir dados por revisão compensatória |
| 7 — Expansão por módulo          | Pilotos aprovados, lotes 2/3; aplicar apresentação em fatias M2/M3, M4/M5, M6, M7, M8, M9, M10 e M1 administrativo                          | T-JOR-01 a 07, regressão de cada módulo e PDFs, sete viewports, aprovação humana de mudanças relevantes                                           | Reverter UI por módulo preservando rotas e contratos; sem alterar cálculos/gates/banco no mesmo incremento                                     |

Cada lote futuro registra commit, ambiente/dataset, comandos/resultados, capturas/previews, decisão humana, limitações e responsável pelo rollback. Nenhum incremento visual compartilha alterações de cálculos, gates ou banco. A qualidade do lote 0 não é presumida a partir do README. Não exigir reescrita integral nem fragmentação mecânica para começar.

## Decisões pendentes e bloqueios de liberação

| Decisão                                                             | Responsável sugerido                 | Momento limite                                                      |
| ------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------- |
| Aparência/tokens e atalhos híbridos                                 | Produto + usuários piloto            | Antes da expansão visual                                            |
| Categorias, grants de identidade e contexto de representantes       | Produto + responsável de privacidade | Antes de documentos reais                                           |
| Finalidade, retenção/hold/expurgo e backups                         | Privacidade/jurídico + operação      | Antes de liberar armazenamento produtivo; sem prazo legal presumido |
| RPO/RTO, quotas, limites/tipos e tratamento de legado local         | Operação + engenharia                | Antes de lote 4 produtivo                                           |
| Distribuidoras/corpus, metas por campo e teto de custo              | Comercial + engenharia + produto     | Antes da PoC paga                                                   |
| Fornecedor/versão/região, termos e idioma                           | Engenharia + privacidade             | Depois da PoC, antes de produção                                    |
| Semântica de Gate C e comportamento efetivo versus specs históricas | Donos de M4/M5/engenharia            | Baseline lote 0; sem reinterpretar em UI                            |

Essas pendências não impedem documentação; impedem as respectivas liberações. Não há bloqueio indispensável para escrever as propostas. O último CI remoto de push não foi comprovado pela ferramenta disponível; registrar como limitação, não sucesso/falha atual.

## Rastreabilidade, revisão e validação

- [Matriz de requisitos, entidades, telas e testes](matriz-rastreabilidade-evolucao.md).
- [Relatório de entrega, revisão independente e validações](revisao-evolucao-ux-documentos-contas.md).
- [SPEC-003](../specs/SPEC-003-design-system-ia/spec.md), [SPEC-013](../specs/SPEC-013-dossie-documental/spec.md), [SPEC-014](../specs/SPEC-014-importacao-contas-energia/spec.md), [SPEC-015](../specs/SPEC-015-ux-jornada-operacional/spec.md).

Finalizar documentação e aguardar revisão humana antes de implementar.

## Resultado local de formatação da base

Antes de aplicar a formatação documental, `node node_modules/prettier/bin/prettier.cjs --check .` retornou exit 1 e apontou somente `apps/api/src/contract/contract-generator.service.ts`. A checagem `--check README.md docs specs` anterior às edições havia passado. Assim, existe falha local de formatação no código da base; isso não comprova o resultado do último CI remoto. Não corrigida por estar fora do escopo. Não usar a falha para reformatar o repositório inteiro.

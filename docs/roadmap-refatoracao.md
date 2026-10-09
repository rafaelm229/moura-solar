# Roadmap vigente — Moura Solar

**Data:** 07/10/2026

**Direção:** refatorar a plataforma existente; manter Material Design

**Escopo da revisão documental inicial (07/10/2026):** não incluía
implementação/push/PR/merge. Incrementos R1 posteriores foram autorizados e têm
seus próprios estados, evidências e merges registrados abaixo.

## Fonte e autoridade

Base documental consultada: `feat/proposal-visual-clarity` no commit
`79b8da5d70d7680bf6caecba61e2bfb8996ee620`.
A main consultada está em `47838f74f447ecf83b5b9758bcecce2ae54df5f4`.
O PR #21 está aberto, com base `feat/evolucao-lote-4-dossie-armazenamento`.
Esses dados são fotografia desta revisão, não instrução para usar branches
desatualizadas. R0 deve atualizar o inventário e avaliar divergências.

A instrução vigente do usuário governa direção e escopo; SPEC-000/016 governam
arquitetura, SPEC-003 governa design e SPECs de domínio governam regras.
Este roadmap governa ordem, dependências e estados. Divergências são registradas
e resolvidas antes da implementação afetada; não mudar gates silenciosamente.

## Decisões mantidas

1. Evoluir NestJS/Next.js/PostgreSQL/Prisma existentes, sem reescrita integral.
2. Preservar testes, dados, sessões, RBAC, PDFs/DOCX, snapshots e histórico.
3. Material Design adaptado à Moura Solar; sem migração Liquid Glass.
4. Web completa primeiro, independentemente de dispositivo/perfil.
5. Extrair serviços progressivamente, com proprietário único de escrita por domínio.
6. Priorizar CRM → cliente/UC → projeto → proposta → contrato → estoque → financeiro.
7. Engenharia/homologação/instalação/mobile são fases posteriores; manter o código
   atual funcional e corrigir regressões durante a migração.
8. Documentos e consumo têm fonte única; análises/projeções não substituem a API.

## Situação observada versus relatada

| Item                                   | Evidência disponível                                      | Limite                                                  |
| -------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| M0–M10                                 | Plano/README registram conclusão e existem módulos NestJS | Não comprova main consolidada nem produção              |
| Dossiê e importação                    | Módulos e entidades presentes na branch consultada        | Políticas operacionais/PoC devem ser verificadas        |
| Worker                                 | main.ts declara consumidores inativos                     | Extração automática não está operacional                |
| 106 integrações, pnpm check e oito E2E | Resultado informado no relatório fornecido pelo usuário   | Não executados nesta atualização documental             |
| Material Design                        | Decisão explícita de manter o visual em aplicação         | Inventário real dos componentes será produzido em R0/R4 |
| Serviços separados                     | Alvo desta evolução                                       | Não implementados por esta documentação                 |

## Sequência executável

R0 está **Implementado em branch** conforme o
[relatório de baseline de 08/10/2026](r0-baseline-2026-10-08.md), com validação
remota aprovada e revisão/consolidação pendentes. O PR #22 foi incorporado em
`feat/proposal-visual-clarity`, sem mudar a `main`. R1 começou em branch somente
com o [incremento R1-01 de contratos](r1-contratos-integracao-2026-10-08.md);
o PR #23 o mesclou nessa branch e o Compose local foi atualizado. O
[R1-02 de correlação](r1-correlacao-import-outbox-2026-10-08.md) foi mesclado
no PR #24 (`b4eb441`) e implantado/verificado no Compose local; produção não foi
implantada. O [R1-03 de versionamento](r1-versionamento-outbox-import-2026-10-08.md)
foi mesclado no PR #26 e liberado somente no Compose local; trabalhador,
publicação e OCR continuam inativos. O
[R1-04 de validação](r1-validacao-eventos-import-2026-10-08.md) foi consolidado
no PR #28, sem deploy por não haver consumidor runtime. A decisão vigente
[ADR-008](adr/ADR-008-importacao-manual-sem-ocr.md) mantém a importação de contas
no padrão manual e retira PoC/OCR do roadmap. O [POC-01](decisao-poc-01-importacao-energia-2026-10-09.md)
fica como registro histórico; nenhuma conta foi enviada e nenhum serviço foi
contratado. O worker e as chamadas externas permanecem inativos.
O [R1-05](r1-inventario-integracao-2026-10-08.md) registra o inventário factual
de auditoria, outbox de importação e projeções; não seleciona consumidor nem
transporte.
A [proposta histórica ADR-007](adr/ADR-007-transporte-integracao-proposta.md)
preserva opções de transporte avaliadas para o piloto OCR que foi retirado do
roadmap por ADR-008. Ela não seleciona um consumidor ativo.
O [R1-07](r1-guard-evento-import-2026-10-08.md) consolidou no PR #32 a guarda
de versão/payload no claim do worker; CI #86 passou. Não ativa consumidor nem
altera linhas legadas, portanto não exigiu deploy.
O [R1-08](r1-08-contrato-aceite-proposta.md) foi validado no commit `df2b571`;
define apenas o contrato de aceite de proposta. R1-09 adiciona a persistência
transacional local desse fato, passou CI completo e foi consolidado na branch
`feat/proposal-visual-clarity` pelo PR #34 (`295326c`); continua sem consumidor,
dispatcher ou transporte. O [R1-10](r1-10-outbox-cadastro-cliente.md) está em
implementação, foi validado localmente, passou CI completa e foi consolidado no
PR #35 (`4607133`) para versionar e persistir `CUSTOMER_CREATED` atomicamente com
o cadastro, com payload mínimo e sem PII. O [R1-11](r1-11-outbox-criacao-oportunidade.md)
está em implementação para persistir `OPPORTUNITY_CREATED` com IDs mínimos na
transação existente, sem dispatcher ou consumidor. R1-11 passou validação local,
CI completa e foi consolidado no PR #36 (`0f0e6ce`). O [R1-12](r1-12-outbox-criacao-uc.md)
foi validado localmente para persistir `UTILITY_UNIT_CREATED` com IDs mínimos
nos dois caminhos existentes de criação de UC, passou CI completa e foi
consolidado no PR #37 (`8551df2`); permanece sem dispatcher ou consumidor.
O [R1-13](r1-13-outbox-criacao-proposta.md) foi consolidado no PR #39
(`85db90f`), com CI completa, para persistir `PROPOSAL_CREATED` atomicamente;
o fato não afirma prontidão de PDF. O [R1-14](r1-14-outbox-entrega-proposta.md)
foi validado localmente para persistir o registro manual de entrega, sem enviar
mensagens ou ativar consumidor; CI completa passou e o PR #40 foi consolidado
na branch `feat/proposal-visual-clarity` (`18c50d0`). O [R1-15](r1-15-outbox-nova-versao-proposta.md)
está em implementação para persistir `PROPOSAL_VERSION_CREATED` atomicamente
com nova versão, auditoria e linhagem, sem snapshots ou preço; PDF continua
sendo gerado depois da transação.
O marco R1 como um todo permanece **Em implementação** e R2–R13 **Planejados**. Direção aprovada
não significa aceite técnico de cada contrato, política ou migração.

| Marco | Entrega                                                                                            | Dependências                               | Evidência de saída                                                                                                |
| ----- | -------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| R0    | Inventário, estabilização, mapa de branches, baseline e plano de consolidação                      | Estado atual e SPEC-000                    | check, migrations, integrações, E2E existentes, build/Compose, restauração e reconciliação; commits identificados |
| R1    | Fachada/gateway gradual, contratos, eventos, outbox/inbox, workflow, observabilidade e flags       | R0                                         | Falha/retry/crash/replay, autorização e correlação comprovados; ADR de transporte                                 |
| R2    | Extração incremental de identidade                                                                 | R1; SPEC-002/016                           | Cookies/refresh/RBAC/sessões/convites/recuperação preservados; isolamento e rollback                              |
| R3    | Cliente, UC, CRM e fronteira de projeto                                                            | R2; SPEC-001/004/016                       | Duplicidade, IDs preservados, transições, dois dispositivos e mapeamento OperationalProject                       |
| R4    | Catálogo completo e tela PRD-001 Material Design                                                   | R3; SPEC-003/017                           | Cadastro, técnica por categoria, fiscais/documentos, preço/estoque projetados, permissões e migração              |
| R5    | Localização, consumo, cálculo solar e preço                                                        | R3/R4; SPEC-005/014/018                    | Proveniência, EnergyReading única, fórmulas versionadas, cenários e snapshots; integrações sem provider presumido |
| R6    | Propostas e PDF                                                                                    | R4/R5; SPEC-006                            | Versão, envio, validade, aceite/rejeição, PDF e regressão histórica                                               |
| R7    | Contratos e documentos                                                                             | R6; SPEC-007/013                           | Minuta, DOCX/PDF, anexo técnico, assinado/conferência, aditivo, cancelamento e gates                              |
| R8    | Estoque e compras                                                                                  | R4/R7; SPEC-009                            | Reservas concorrentes, movimentos, custódia, seriais/lotes, compras/custo e compensações                          |
| R9    | Financeiro                                                                                         | R7/R8; SPEC-008                            | Receber/pagar, parcelas, recebimento/estorno, comissão/margem/caixa e gate financeiro                             |
| R10   | Aceite da V1 integrada                                                                             | R2–R9                                      | Jornada completa, falhas parciais, retries, autorização, migração e implantação/rollback validados                |
| R11   | Plataforma analítica incremental                                                                   | Contratos R1 e domínios estáveis; SPEC-019 | Bronze/Silver/Gold com linhagem, deduplicação, reconciliação e KPIs oficiais                                      |
| R12   | Refatoração/expansão de engenharia, homologação, instalação, pós-venda, monitoramento e automações | R10; SPEC-010/011/012                      | Jornadas próprias e continuidade funcional de cada módulo                                                         |
| R13   | React Native/Expo complementar                                                                     | R10/R12, web completa e APIs estáveis      | Segurança, sincronização, mídia, campo e offline especificado/testado                                             |

R11 pode receber um piloto técnico após R1, mas não deve atrasar a V1.
R2 precede R3 conforme o combinado; identidade exige piloto e adaptadores, não
substituição abrupta do login. A separação lógica pode anteceder deploy independente.
Não criar automaticamente um serviço por tabela nem introduzir toda infraestrutura
distribuída antes de existir um consumidor demonstrável.

## Trilhas transversais

- **Material/rotas:** continuidade visual desde R0; rotas reais e deep links por
  incremento, sem perder sessões/cache, navbar mobile, formulários ou capacidade.
- **Documentos:** verificar políticas/backup/legado no R0 e reaproveitar o dossiê
  existente nas fases necessárias.
- **Contas de energia:** upload, transcrição, revisão e confirmação manuais pela
  SPEC-014; PoC, OCR e extração automática estão fora do roadmap vigente (ADR-008).
- **Sincronização:** revalidação após mutações e testes com dois dispositivos;
  SSE/WebSocket só após definir necessidade, escopo, reconexão e autorização.
- **Operação:** CI, builds, Compose, backups/restauração, migrações, logs/métricas e
  segredos acompanham cada incremento, sem comprovação presumida pelo README.
- **Compatibilidade:** preservar payloads, IDs, datas/decimais, URLs publicadas e
  snapshots; manter adaptadores transitórios com prazo de remoção registrado.

## Gates de entrega

Para cada incremento: escopo/aceite definido → implementação autorizada → testes
pertinentes → demonstração → evidência → consolidação/liberação autorizadas.
“Implementado em branch”, “Validado”, “Consolidado” e “Liberado” são estados distintos.
Pendências de fornecedor, política ou regras impedem somente a entrega dependente.

A V1 não está vendida/quitada apenas porque um recebível foi criado. Os gates
contratual, material e financeiro continuam derivados de regras reais. Eventos
como `contract.signed` não dispensam conferência/aprovação exigidas.
A saga proposta deve reconciliar estado, não inventar uma nova regra de venda.

## Estado de R0 e próximo incremento

O [relatório de baseline R0](r0-baseline-2026-10-08.md) preserva o estado e as
pendências observados naquela revisão; o PR #22 e seu CI não consolidaram a
`main` nem dispensam revisão formal do baseline. A seção original que dizia que
R1 não havia começado é histórica: R1-01 foi autorizado depois e a sequência
atual está registrada acima. A importação de contas segue manual por decisão
ADR-008; não há piloto OCR planejado. R1-07 protege claims v1, mas ainda faltam contrato/efeito durável,
transporte, inbox/retenção, retry/quarentena/replay e evidência de crash. O
inventário R1-05 e a proposta histórica ADR-007 não habilitam consumidor. A
decisão ADR-008 deixa sem escopo o consumidor de OCR; os demais gates do R1
continuam independentes. R1-09 não aprova despacho; inbox, retries, replay,
retenção final e reconciliação seguem pendentes.

## Adiados, sem implementação nesta fase

WhatsApp, boletos e React Native permanecem fora da tarefa atual. Integrações
bancárias, assinatura eletrônica externa, marketplace/e-commerce e emissão fiscal
completa não ficam aprovadas apenas por campos fiscais no catálogo.
O [registro de features](registro-features.md) mantém pendências e escopo herdado.

## Rollback

Mudanças pequenas, flags/adaptadores e migrations aditivas. Em domínio extraído:
parar novos comandos quando necessário, drenar/reconciliar eventos e transferir
propriedade de escrita de modo controlado. Não reativar dois escritores nem
restaurar banco antigo sobre novas operações. Sem apagar volumes ou histórico.

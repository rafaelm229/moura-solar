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
foi consolidado no PR #41 (`5540b26`) para persistir `PROPOSAL_VERSION_CREATED`
atomicamente com nova versão, auditoria e linhagem, sem snapshots ou preço; PDF
continua sendo gerado depois da transação. O [R1-16](r1-16-outbox-qualificacao-oportunidade.md)
foi consolidado no PR #42 (`6442fc7`) com CI completa para registrar
`OPPORTUNITY_QUALIFIED` junto da transição CRM já persistida; deduplicação usa
o ID imutável da transição e os gates permanecem iguais. O
[R1-17](r1-17-outbox-perda-oportunidade.md) foi consolidado no PR #43
(`60a73ec`), com CI completa, para registrar `OPPORTUNITY_LOST` junto da
transição durável; o evento omite motivo e observações da perda. O
[R1-18](r1-18-outbox-reabertura-oportunidade.md) foi consolidado no PR #44
(`97788b4`), com CI completa verde, para registrar `OPPORTUNITY_REOPENED` junto
da transição de reabertura já permitida; o evento omite a justificativa e segue
sem dispatcher ou consumidor. O [R1-19](r1-19-outbox-rejeicao-proposta.md) foi
consolidado no PR #46 (`8a5159c`), com CI completa verde, para registrar
`PROPOSAL_REJECTED` na transação existente, usando o ID da auditoria para
identidade/deduplicação e sem motivo ou notas no payload. O
[R1-20](r1-20-outbox-arquivo-restauracao-cliente.md) foi consolidado no PR #48
(`d4f1d8e`), com CI completa verde, para registrar arquivamento/restauração de
cliente com payload mínimo ligado à auditoria, preservando permissões e o gate
de oportunidades ativas. O [R1-21](r1-21-outbox-atualizacao-uc.md) foi
consolidado no PR #49 (`bd3029d`), com CI #105 completa verde, para registrar
atualização versionada da UC com auditoria, sem expor distribuidora, código da
conta ou atributos técnicos no evento.
O [R1-22](r1-22-outbox-atualizacao-cliente.md) foi consolidado no PR #51
(`03363d8`), com CI #107 completa verde, para registrar atualização do cliente
com auditoria e apenas IDs, sem incluir nome, documento ou observações no evento.
O [R1-23](r1-23-outbox-atualizacao-oportunidade.md) foi consolidado no PR #53
(`b0b2940`), com CI #109 completa verde, para registrar atualização versionada
de oportunidade com auditoria, sem publicar título, necessidade, consumo,
prioridade ou outros valores comerciais.
O [R1-24](r1-24-outbox-criacao-atividade.md) foi implementado nesta branch:
contrato e gravação atômica de `ACTIVITY_CREATED`, com payload mínimo e sem
publicação ou consumidor; PR #55 consolidado em `ca681e3`, CI #111 completa
verde.
O [R1-25](r1-25-outbox-cancelamento-atividade.md) foi consolidado no PR #57
(`b147ea8`), com CI #113 completa verde, para registrar `ACTIVITY_CANCELED` v1
junto da auditoria, usando IDs mínimos e sem publicação ou consumidor.
O [R1-26](r1-26-outbox-conclusao-atividade.md) foi consolidado no PR #59
(`56b3074`), com CI #115 completa verde, para registrar `ACTIVITY_COMPLETED` v1
e o ID opcional do follow-up, sem resultado ou texto de atividade e sem
publicação/consumidor.
O [R1-27](r1-27-outbox-reagendamento-atividade.md) foi consolidado no PR #61
(`35d49dc`), com CI #117 completa verde, para registrar `ACTIVITY_RESCHEDULED`
v1 com IDs mínimos, sem data/notas e sem publicação/consumidor.
O [R1-28](r1-28-outbox-primeira-atividade-oportunidade.md) foi consolidado no
PR #63 (`ac139dc`), com CI #119 completa verde, para emitir `ACTIVITY_CREATED`
v1 também para a primeira atividade criada junto com a oportunidade;
follow-ups de outros comandos continuam fora deste escopo.
O [R1-29](r1-29-outbox-followup-qualificacao.md) foi consolidado no PR #65
(`cad433e`) para emitir `ACTIVITY_CREATED` v1 para o follow-up opcional da
qualificação. `pnpm check` e integração comercial passaram localmente; a CI #121
e sua repetição não iniciaram os testes por rate limit do Docker Hub.
O [R1-30](r1-30-outbox-followup-conclusao-atividade.md) foi consolidado no PR
#67 (`c31ba5f`) para emitir `ACTIVITY_CREATED` v1 para follow-up criado na
conclusão de uma atividade. `pnpm check` e integração comercial passaram
localmente; a CI #123 e sua repetição falharam antes dos testes por rate limit do
Docker Hub.
O [R1-31](r1-31-outbox-followup-entrega-proposta.md) foi consolidado no PR #69
(`fcb2b96`) para registrar `ACTIVITY_CREATED` v1 para o follow-up criado no
registro de entrega de proposta. `pnpm check` e a integração de propostas
passaram localmente; a CI #125 falhou antes do checkout/testes ao baixar
`postgres:17-alpine` do Docker Hub (timeout/limite anônimo), portanto a CI remota
não foi validada.
O [R1-32](r1-32-outbox-atividade-formalizacao-proposta.md) foi consolidado no
PR #71 (`ceb84ad`) para registrar `ACTIVITY_CREATED` v1 para a atividade de
formalização criada no aceite da proposta. `pnpm check` e integração de propostas
passaram localmente; a CI #127 falhou antes do checkout/testes ao baixar
`postgres:17-alpine`, portanto não foi validada.
O [R1-33](r1-33-outbox-followup-entrega-contrato.md) foi consolidado no PR #73
(`33f7213`) para registrar `ACTIVITY_CREATED` v1 no follow-up criado ao enviar
contrato para assinatura, compartilhando a auditoria existente e sem ativar
consumidor. `pnpm check` e integração de contratos passaram localmente. A CI #129
falhou antes do checkout/testes por timeout no pull de `postgres:17-alpine`,
portanto não foi validada. A repetição CI #130 no PR documental #74 concluiu
checks, migrações, integração e E2E com sucesso.
O [R1-34](r1-34-outbox-atividade-conferencia-contrato.md) foi consolidado no PR
#75 (`431a8a4`) para registrar `ACTIVITY_CREATED` v1 para a atividade criada
pela decisão humana de conferência do contrato, aprovada ou rejeitada. Reutiliza
auditoria/correlação e transação locais; não altera checklist, gates, resposta
nem ativa consumidor. Integração local 7/7 e CI #131 completa passaram.
O [R1-35](r1-35-outbox-eventos-catalogo.md) foi consolidado no PR #77, merge
`2680bff`, CI #133 completa verde: criação e atualização de CatalogItem registram
IDs e versão no payload, sem valores ou projeções de preço/estoque. Nenhuma
migration ou consumidor está no escopo.
O [R1-36](r1-36-outbox-entrega-contrato.md) foi consolidado no PR #79, merge
`0a246e8`, CI #135 completa verde: `CONTRACT_DELIVERED` registra a entrega
manual junto da auditoria e da atividade, somente com IDs, sem canal ou
destinatário. Não realiza envio externo. Sem migration ou consumidor.
O [R1-37](r1-37-outbox-cancelamento-contrato.md) foi consolidado no PR #81,
merge `7ff3b85`, CI #137 completa verde: `CONTRACT_CANCELED` v1 é escrito junto
da auditoria na mesma transação, com IDs apenas e sem motivo. Não ativa
consumidor, compensação financeira ou efeito externo; sem migration.
O [R1-38](r1-38-outbox-registro-aditivo-contrato.md) foi consolidado no PR #83,
merge `1d4373c`, CI #139 verde: `CONTRACT_AMENDMENT_RECORDED` v1 acompanha
somente o registro manual e a auditoria, sem detalhes do aditivo. Isso não
significa documento de aditivo implementado.
O [R1-39](r1-39-outbox-conferencia-assinado.md) foi consolidado no PR #85,
merge `0dcf7eb`, CI #141 verde: `CONTRACT_SIGNED_REVIEWED` v1 registra apenas
IDs e a decisão humana `VERIFIED`/`REJECTED`, sem checklist ou motivo. Não altera
gates nem o efeito financeiro posterior.
O [R1-40](r1-40-outbox-upload-assinado.md) foi consolidado no PR #87, merge
`dacf0f67da94de33df816f03dfbfc244055d2df5`, CI run `38010236121` verde. Registra
o upload manual do contrato e sua atividade de conferência; não lê o conteúdo
nem libera o gate. A gravação no armazenamento externo antecede a transação
local e continua sem compensação distribuída.
O [R1-41](r1-41-outbox-contrato-criado.md) foi consolidado no PR #89, merge
`40d7ea242ce6e7ee9486d816009ec0d747c945f5`, CI run `38012077654` verde. Registra
`CONTRACT_CREATED` e a atividade de assinatura na transação local existente;
mantém snapshots, valores, documentos, efeitos financeiros e gates sem alteração.
O [R1-42](r1-42-outbox-revisao-aprovacao-contrato.md) foi consolidado no PR #91,
merge `1eefd1eef9cf1ff3f19885c89fd927679976aea4`, CI run `38013650317` verde.
Registra solicitação de revisão e aprovação manual sem notas, efeitos financeiros
ou mudança do gate contratual.
O [R1-43](r1-43-durabilidade-outbox-restart.md) foi consolidado no PR #93,
merge `833132b45e0ae4732aec96ceac3b4d8d65cb96c5`, CI run `38015253401` verde.
Demonstra que eventos confirmados persistem após encerramento abrupto e restart
da API; não introduz publicação, consumidor ou mudança de contrato.
O [R1-44](r1-44-auditoria-contratos-eventos.md) foi consolidado no PR #95,
merge `5e4ebf7db3d2deeccdf448b43ec2ee11c15c3d25`, com CI run `38017170066`
verde. A auditoria confirmou 32/32 nomes de eventos dos produtores com tipos de
payload v1 e parsers. Trinta usam o envelope compartilhado; os dois eventos de
importação mantêm o formato legado e continuam sem adaptação, coerente com a
decisão de importação manual e a ausência de consumidor justificado. A família
F-34 continua em implementação por causa dos requisitos independentes de inbox,
publicação e processamento durável.
O [R1-45](r1-45-durabilidade-importacao-manual-restart.md) adiciona prova de
restart abrupto para a confirmação manual em `ImportOutbox`, cobrindo a outbox
legada sem mudar seu contrato ou ativar worker/consumidor. O teste local passou
8/8 cenários, a integração completa passou 125/125 e `pnpm check` passou; CI do
PR permanece pendente.
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

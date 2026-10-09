# Registro de features — Moura Solar

**Data:** 07/10/2026

**Autoridade:** escopo e rastreabilidade do [roadmap vigente](roadmap-refatoracao.md)

## Como usar

As famílias abaixo abrangem o escopo discutido e herdado das SPEC-000 a SPEC-015.
Todas as capacidades dessas SPECs permanecem no produto, mesmo quando a linha
resume uma família. Antes de um incremento, desdobrar em requisitos/comandos/telas
com ID derivado (ex.: F-24.01), dependência, responsável, teste e evidência.
Não declarar uma família concluída com apenas um formulário ou endpoint.

“Existente/relatado” descreve evidência disponível; não equivale a Validado,
Consolidado ou Liberado. O estado formal abaixo se refere ao incremento de
refatoração/expansão, não revoga capacidades existentes nem atesta que a família
inteira já esteja implementada.
Requisitos sem prova atual ficam Planejado ou Em especificação; R0 confere cada
capacidade no checkout antes de promover status. Decisões operacionais pendentes
bloqueiam somente a entrega dependente.

<!-- prettier-ignore -->
| ID   | Feature / capacidades                                                                 | Fase             | SPEC / fonte                 | Estado do incremento | Situação inicial                                            | Aceite resumido                                                            |
| ---- | ------------------------------------------------------------------------------------- | ---------------- | ---------------------------- | -------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| F-01 | Identidade: login/logout, refresh, sessões, convites, recuperação, equipe/papéis/RBAC | R2               | SPEC-002                     | Em especificação     | M1 relatado e módulo presente; revalidar                    | Sessão/refresh, isolamento organizacional e negativos preservados          |
| F-02 | Cliente: contatos/endereço, CEP, duplicidade, arquivo/restauro                        | R3               | SPEC-004                     | Em especificação     | M2 relatado; preservar e refatorar                          | Mesmos IDs, consulta nos aparelhos e comandos autorizados                  |
| F-03 | UC: distribuidora, titularidade, vínculos e documentos                                | R3/R5            | SPEC-004; SPEC-018           | Em especificação     | Existente + evolução planejada                              | UC única, versão/fonte e contexto autorizado                               |
| F-04 | CRM: lead/qualificação, oportunidade, funil, atividades, perdas/reabertura            | R3               | SPEC-001; SPEC-004           | Em especificação     | Oportunidade/atividade existentes; lead revisar             | Transições reais e sem segundo status visual                               |
| F-05 | Project: contexto, gates, responsáveis, próximas ações                                | R3/R10           | SPEC-001; SPEC-015; SPEC-016 | Em especificação     | OperationalProject existente; ciclo alvo pendente           | Mapeamento sem duplicação e compatibilidade histórica                      |
| F-06 | Catálogo: SKU/nome/marca/modelo/categoria/unidade/status                              | R4               | SPEC-017                     | Em especificação     | CatalogItem existente; cadastro ampliado planejado          | Unicidade, busca, filtros e migração                                       |
| F-07 | Fiscal de produto: GTIN/GTIN tributável, NCM, CEST/perfil                             | R4               | SPEC-017                     | Planejado            | Planejado; políticas pendentes                              | Validação sem códigos fictícios/inferências fiscais                        |
| F-08 | Técnica por categoria: módulo/inversor/bateria/proteção/outros                        | R4               | SPEC-005; SPEC-017           | Em especificação     | Dados técnicos existentes; schema ampliado planejado        | Obrigatoriedade por família e unidades explícitas                          |
| F-09 | Logística, dimensões/peso, fornecedor/código, garantias/certificações                 | R4               | SPEC-017                     | Planejado            | Ampliação planejada                                         | Origem/versão e referência documental válidas                              |
| F-10 | Catálogo UI: PRD-001 tabela/cards, busca/filtros, drawer/abas, ações                  | R4               | SPEC-003; SPEC-017           | Planejado            | Planejado mantendo Material                                 | Estados, móvel, custos autorizados e deep links                            |
| F-11 | Catálogo: importação, revisão/duplicidade, confirmar e histórico                      | R4               | SPEC-017                     | Planejado            | Planejado                                                   | Preview, validação, idempotência e auditabilidade                          |
| F-12 | Catálogo com projeções de custo/preço/estoque por local                               | R4/R8/R9         | SPEC-008; SPEC-009; SPEC-017 | Planejado            | Integração existente parcial; alvo planejado                | Dono/origem/atualização sem saldo editável em Product                      |
| F-13 | Localização: CEP/geocoding, município/IBGE, coordenadas e fuso                        | R5               | SPEC-018                     | Planejado            | Integrações planejadas; provedor pendente                   | Cobertura/fonte/confiança e correção manual                                |
| F-14 | Referências: distribuidora/tarifa/ANEEL e irradiação                                  | R5               | SPEC-018                     | Planejado            | Planejado; fonte e contrato pendentes                       | Data, versão, unidade e indisponibilidade explícita                        |
| F-15 | Consumo: 12 meses, revisões/proveniência, UC e duplicatas                             | R5               | SPEC-005; SPEC-014; SPEC-018 | Em especificação     | EnergyReading e revisões existentes                         | Fonte única; ausência não é zero; snapshot preservado                      |
| F-16 | Levantamento, projetos-base e dimensionamento versionado                              | R5               | SPEC-005; SPEC-018           | Em especificação     | M3 relatado; capacidades de projetos-base inventariar       | Fórmulas/versões/aprovação e cenário reproduzível                          |
| F-17 | Solar/baterias: tipos de sistema, potência, perdas, geração e compatibilidade         | R5               | SPEC-005; SPEC-017; SPEC-018 | Em especificação     | Existente parcial + evolução                                | Validação técnica por tipo e comparação antes/depois                       |
| F-18 | Pricing: BOM, serviços/custos extras, margem, desconto/alçada                         | R5               | SPEC-005; SPEC-018           | Em especificação     | M3 relatado; extração planejada                             | Decimal, regra preservada, versão e preço reproduzível                     |
| F-19 | Proposta: versões/validade, PDF sem capa conforme template, envio, aceite/rejeição    | R6               | SPEC-006                     | Em especificação     | M4 relatado; PR21 em branch                                 | Snapshot, clareza em português e E2E/PDF preservados                       |
| F-20 | Contrato: minuta/campos, DOCX/PDF, envio, assinado/conferência, aditivo/cancelamento  | R7               | SPEC-007                     | Em especificação     | M5 relatado; extração planejada                             | Gates, permissões e versões preservadas                                    |
| F-21 | Anexo técnico e substituição de equipamentos com revisão/aprovação                    | R4/R7            | SPEC-005; SPEC-007; SPEC-017 | Em especificação     | Integração a verificar/especificar                          | BOM/snapshot e efeitos de alteração rastreados                             |
| F-22 | Dossiê privado: upload, versões, vínculos, verificação, reconciliação                 | R0/R7            | SPEC-013                     | Em especificação     | Módulo presente; políticas produtivas pendentes             | Hash/READY, autorização e restauração                                      |
| F-23 | Importação manual de contas: documento, transcrição, revisão e confirmação            | R5               | SPEC-014; ADR-008            | Em especificação     | Intake e revisão manual existentes; OCR/PoC fora do roadmap | Campos conferidos, conflitos explícitos, proveniência e confirmação humana |
| F-24 | Estoque: físico/reservado/disponível/trânsito/quarentena e alertas                    | R8               | SPEC-009                     | Em especificação     | M7 relatado; extração planejada                             | Movimentos, bloqueios e concorrência sem saldo negativo                    |
| F-25 | Locais: depósitos/veículos/equipes, transferir/separar/retirar/consumir/devolver      | R8/R12           | SPEC-009; SPEC-010           | Em especificação     | Existente conforme capacidades; inventariar                 | Custódia, confirmação e conciliação de materiais                           |
| F-26 | Lotes/seriais, inventário/ajustes, perdas/avaria/garantia e custo médio               | R8               | SPEC-009                     | Em especificação     | Existente parcial; inventário completo verificar            | Histórico e movimentos compensatórios; serial único                        |
| F-27 | Fornecedores/compras: solicitar/aprovar/pedido/receber parcial/devolver               | R8               | SPEC-009                     | Em especificação     | M7 relatado; extração planejada                             | Compra→entrada→custo→pagar sem duplicidade                                 |
| F-28 | Financeiro: contas/plano/parcelas, receber/liquidar/estornar/renegociar               | R9               | SPEC-008                     | Em especificação     | M6 relatado; extração planejada                             | Idempotência, alocação e gate financeiro preservados                       |
| F-29 | Financeiro: pagar/pagamentos, custos realizados, comissão/margem e caixa              | R9               | SPEC-008                     | Em especificação     | M6 relatado; extração planejada                             | Previsto/realizado e títulos/recebimentos distintos                        |
| F-30 | Esteira integrada: bloqueios/responsáveis/próxima ação/saga                           | R1–R10           | SPEC-001; SPEC-015; SPEC-016 | Em especificação     | Gates existentes; integração distribuída planejada          | Falha parcial/compensação/reconciliação e E2E V1                           |
| F-31 | Material Design: tokens/ícones/componentes, cards/navbar, layouts e estados           | R0–R10           | SPEC-003                     | Em especificação     | Direção aprovada; inventariar código                        | Sem glass/troca global e sem regressão por viewport                        |
| F-32 | Navegação: shell, rotas Next.js reais, filtros/abas, deep links/conta                 | R3–R10           | SPEC-003; SPEC-015           | Em especificação     | Parte concentrada em /; migração planejada                  | Refresh/voltar/returnTo/formulário/cache seguros                           |
| F-33 | Dois dispositivos: sincronização/revalidação e login mobile                           | R0–R10           | SPEC-000; SPEC-002; SPEC-003 | Em especificação     | Revalidar funcionamento; tempo real especificar             | Mutação visível e erro de rede não faz logout                              |
| F-34 | Gateway/fachada, contratos, observabilidade, eventos, outbox/inbox e retries          | R1               | SPEC-016; SPEC-019           | Em implementação     | R1-08..29 consolidados; R1-30 ativo                        | Consumidor, crash/replay, inbox e retries operacionais pendentes           |
| F-35 | Propriedade/banco por serviço e migração/cutover/rollback                             | R1–R10           | SPEC-000; SPEC-016           | Planejado            | Schema compartilhado atual                                  | Escritor único, reconciliação e sem perda                                  |
| F-36 | Dados: ingestão/backfill, Bronze/Silver/Gold, qualidade/linhagem/KPIs                 | R11              | SPEC-012; SPEC-019           | Planejado            | Planejado; projeções operacionais existentes                | Reconciliação e políticas de acesso/retenção                               |
| F-37 | Engenharia: executivo/versões, strings/MPPTs, ART/aprovação                           | R12              | SPEC-010                     | Em especificação     | M8 relatado; preservar durante V1                           | Jornada própria e validação técnica                                        |
| F-38 | Homologação: concessionária/pendências/liberação/medidor                              | R12              | SPEC-010                     | Em especificação     | M8 relatado; preservar durante V1                           | Gates e evidências por processo                                            |
| F-39 | Instalação: agenda/equipes/OS, checklist/EPIs/fotos/seriais, comissionar/entregar     | R12              | SPEC-010                     | Em especificação     | M8 relatado; preservar durante V1                           | Campo web, bloqueios e conciliação de materiais                            |
| F-40 | Pós-venda: chamados/SLA, garantia/RMA, visitas/orçamento e reconexão                  | R12              | SPEC-011                     | Em especificação     | M9 relatado; preservar durante V1                           | Histórico, custo/prazo e orçamento aprovado                                |
| F-41 | Monitoramento: leituras/desempenho/incidentes/conectividade                           | R12              | SPEC-011                     | Em especificação     | M9 relatado; integrações reais verificar                    | Fonte/tempo e incidentes sem telemetria presumida                          |
| F-42 | Automações: regras/versionamento/execuções, atenção/notificações/metas                | R12              | SPEC-012                     | Em especificação     | M10 relatado; preservar durante V1                          | Idempotência, deduplicação, alçadas e visibilidade                         |
| F-43 | Mobile React Native/Expo: segurança, campo/mídia e offline                            | R13              | SPEC-000; SPEC-010           | Planejado            | Adiado; offline requer SPEC própria                         | Web completa e API estável antes de implementação                          |
| F-44 | WhatsApp e boletos                                                                    | Futura           | SPEC-006; SPEC-008           | Planejado            | Adiado explicitamente                                       | Provedor/contratos/regras a especificar; sem implementar                   |
| F-45 | CI, testes, Docker/deploy, migrations, backups/restore e segredos                     | R0 e transversal | SPEC-000; Definition of Done | Em especificação     | Fundação existente; revalidar por incremento                | Comandos/ambiente/CI e plano de restauração                                |

## Cobertura do escopo herdado

Esta tabela encaminha cada SPEC anterior às famílias do roadmap. Os requisitos,
gates, estados, modelos, critérios de aceite e testes de seus documentos continuam
normativos; as famílias resumidas não os substituem. R0 deve registrar por requisito
o comportamento observado, a evidência e a diferença antes de executar uma fase.

| Fonte herdada                                                   | Famílias de continuidade           | Verificação pendente                                     |
| --------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------- |
| [SPEC-000](../specs/SPEC-000-arquitetura/spec.md)               | F-30–F-35, F-43, F-45              | Fronteiras, API, autenticação, persistência e operação   |
| [SPEC-001](../specs/SPEC-001-jornada-cliente/spec.md)           | F-04, F-05, F-20, F-24, F-28, F-30 | Estados, responsabilidades e gates reais                 |
| [SPEC-002](../specs/SPEC-002-identidade-permissoes/spec.md)     | F-01, F-33                         | Permissões efetivas, sessões e isolamento                |
| [SPEC-003](../specs/SPEC-003-design-system-ia/spec.md)          | F-10, F-31–F-33                    | Componentes, rotas, estados e viewports                  |
| [SPEC-004](../specs/SPEC-004-clientes-oportunidades/spec.md)    | F-02–F-04                          | Cliente, UC, oportunidade e atividade                    |
| [SPEC-005](../specs/SPEC-005-dimensionamento-custos/spec.md)    | F-08, F-15–F-18, F-21              | Fórmulas, insumos, cenários e custos                     |
| [SPEC-006](../specs/SPEC-006-propostas/spec.md)                 | F-19, F-21, F-44                   | Versões, PDF, aceite e envio                             |
| [SPEC-007](../specs/SPEC-007-contratos-documentos/spec.md)      | F-20–F-22                          | Minutas, anexos, assinado e gates                        |
| [SPEC-008](../specs/SPEC-008-financeiro/spec.md)                | F-12, F-28, F-29, F-44             | Receber/pagar, liquidação e indicadores                  |
| [SPEC-009](../specs/SPEC-009-estoque-compras/spec.md)           | F-12, F-24–F-27                    | Movimentos, custódia, compras e custo                    |
| [SPEC-010](../specs/SPEC-010-engenharia-instalacao/spec.md)     | F-25, F-37–F-39, F-43              | Engenharia, homologação e campo web                      |
| [SPEC-011](../specs/SPEC-011-pos-venda/spec.md)                 | F-40, F-41                         | Suporte, garantia e monitoramento                        |
| [SPEC-012](../specs/SPEC-012-automacoes-gestao/spec.md)         | F-36, F-42                         | Regras, notificações, KPIs e observabilidade             |
| [SPEC-013](../specs/SPEC-013-dossie-documental/spec.md)         | F-20, F-22                         | Vínculos, versões, hash, acesso e restauração            |
| [SPEC-014](../specs/SPEC-014-importacao-contas-energia/spec.md) | F-15, F-23                         | Intake, transcrição e confirmação manuais; OCR histórico |
| [SPEC-015](../specs/SPEC-015-ux-jornada-operacional/spec.md)    | F-05, F-30–F-33                    | Jornada, pendências, navegação e ações                   |

## Dependências e evidências obrigatórias por incremento

Ficha: ID; estado; branch/commit; responsável; SPEC/requisito; dependências;
diferença antes/depois; comandos/endpoints/telas; contrato/evento; migração; testes;
viewports; evidência; pendências; plano de rollback; data e autorização de entrega.

Estados: Planejado → Em especificação → Pronto para execução → Em implementação →
Implementado em branch → Validado → Consolidado → Liberado. Uma transição pode
voltar quando a evidência ficar inválida. Registro de aprovação cita decisão real,
não presume aceite por ordem do roadmap.

## Não incluídos por inferência

Emissão fiscal completa/NF-e, marketplace/e-commerce, importação aduaneira,
integração bancária automática, portal público/cliente e assinatura eletrônica
externa não são aprovados por esta atualização. Campos fiscais, upload de assinado
e boletos adiados não autorizam essas integrações. Registrar nova demanda antes
de adicioná-las a uma fase de implementação.

## Próxima ação

R0: confirmar matriz de capacidades/endpoints/telas e resultados atuais,
reconciliar branches, testes e documentos. Preservar histórico M0–M10 e os lotes
anteriores, evitando executar novamente trabalho comprovado ou declarar produção.

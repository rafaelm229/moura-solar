# SPEC-016 — Refatoração evolutiva e fronteiras de domínio

**Versão:** 0.1.0

**Data:** 07/10/2026

**Status:** Direção aprovada; contratos técnicos em especificação

**Fases:** R0–R10

**Dependências:** SPEC-000, SPEC-001, SPEC-002 e SPEC-003

## Objetivo

Migrar gradualmente a plataforma existente para fronteiras claras e serviços
independentes quando cada extração estiver validada. Preservar comportamento,
dados, testes e operação. Usar coexistência e roteamento progressivo
(Strangler Fig), sem reescrita integral.

## Estado atual e alvo

Hoje: módulos NestJS, schema Prisma compartilhado, PostgreSQL, web Next.js e
worker sem consumidor ativo. Alvo: domínio com proprietário de escrita único,
contratos explícitos, transações locais e integração resiliente. Banco por serviço
pode compartilhar instância física; schemas/credenciais e acessos devem impedir
escrita cruzada. Escolha database/schema e transporte será documentada em ADR
antes da extração correspondente.

| Código atual                   | Fronteira alvo                       | Regra                                                   |
| ------------------------------ | ------------------------------------ | ------------------------------------------------------- |
| identity                       | Identity                             | Sessões/RBAC e contexto organizacional preservados      |
| commercial                     | Customer e CRM                       | Customer/UC e oportunidade têm donos definidos          |
| OperationalProject/engineering | Project e posteriormente Engineering | Mapear agregado existente; não criar cadastro duplicado |
| CatalogItem/design             | Catalog                              | Catálogo independente de saldo e preço autoritativo     |
| design                         | Consumption, Solar Engine e Pricing  | Preservar leituras, versões, cálculo e snapshots        |
| proposal                       | Proposal                             | Versões e aceite imutáveis quando publicados            |
| contract                       | Contract                             | Assinado/conferência/aditivos/gates preservados         |
| inventory                      | Inventory/Purchasing                 | Reservas, custódia, lotes e movimentos consistentes     |
| financial                      | Finance                              | Títulos, liquidações e gate financeiro preservados      |
| dossier                        | Document                             | Metadados, objetos e acesso privado versionados         |
| energy-import                  | Energy Import/worker                 | Revisão humana e confirmação transacional               |
| after-sales/automations        | Fronteiras posteriores               | Preservar funções existentes até a extração             |

Fronteira lógica não obriga deploy imediato de cada linha. Location Intelligence
é nova fronteira de dados de referência, definida na SPEC-018.

## Projeto versus oportunidade

Opportunity pertence ao CRM. Project coordena contexto operacional por referências,
sem tomar propriedade de proposta, estoque ou financeiro. Já existe
OperationalProject; R3 deve mapear IDs, momento efetivo de criação, histórico e links.
O caso de uso atual aceita uma oportunidade e não comprova, sozinho, venda
concluída; a política do ciclo precisa de decisão antes de mudar banco ou gates.

A possibilidade de projeto em preparação antes da proposta precisa de decisão
registrada sobre ciclo de vida e migração. Não criar automaticamente um segundo
Project nem mover o momento da venda para acomodar telas. Enquanto o contrato
não estiver fechado, adaptar referências existentes de oportunidade/projeto e
preservar gates. Este ponto é bloqueio do incremento dependente, não da documentação.

## Requisitos e aceite

| ID     | Requisito                                                         | Evidência                                                   |
| ------ | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| REF-01 | Baseline com código, capacidade, migrações e testes identificados | Relatório R0 com commit/ambiente/comandos e limitações      |
| REF-02 | Preservar regras, IDs, PDFs e snapshots                           | Comparação antes/depois e testes do domínio                 |
| REF-03 | Dono único por agregado e acesso por contrato                     | Matriz de propriedade e testes de escrita/isolamento        |
| REF-04 | API/fachada compatível e autorização contextual                   | Contrato OpenAPI, clientes e testes negativos               |
| REF-05 | Transação local + outbox; inbox idempotente                       | Crash após commit, entrega repetida, replay e recuperação   |
| REF-06 | Workflow com timeout/compensação/reconciliação                    | Falha parcial não deixa projeto falsamente concluído        |
| REF-07 | Migrations aditivas e cutover controlado                          | Contagem/hash amostral, integridade, restauração e execução |
| REF-08 | Sessão e RBAC preservados                                         | Refresh concorrente, cookies, revogação e dois dispositivos |
| REF-09 | Observabilidade por correlation/causation ID                      | Rastrear uma jornada e uma falha sem dados sensíveis        |
| REF-10 | Rollback sem perda nem dois escritores                            | Ensaio de dreno/reconciliação/retorno e registro            |
| REF-11 | Material Design preservado                                        | Validação visual/funcional em viewports da SPEC-003         |
| REF-12 | Estado de entrega sustentado por evidência                        | Registro de features atualizado sem concluir por existência |

## Integração e consistência

Eventos de integração têm versão e semântica explícitas (SPEC-019).
Saga coordena efeitos entre domínios sem promessa de atomicidade global.
Mudança de protocolo de integração não autoriza alterar regras de negócio.
Durante coexistência, efeitos dentro da transação atual permanecem atômicos.

Confirmar assinatura, reservar material e registrar recebível são fatos diferentes.
Para um evento disparar automação, satisfazer também gates e autorizações atuais.
Contrato cancelado, falta parcial, revisão de proposta e estorno têm fluxo de
compensação definido antes de ligar consumidores produtivos.

## Dados e migração

Inventariar relações Prisma e consultas cruzadas. Extrair por agregado, manter IDs
estáveis, backfill verificável e compatibilidade de leitura. Evitar dual-write
aplicacional; se uma captura transitória for necessária, usar mecanismo durável,
idempotente e reconciliado. FKs interdomínio atuais só são removidas após prova
de integridade do modelo de referência/eventos equivalente.

## Tarefas

- [ ] R0: inventário/CI/Compose/migrations/integração/E2E e divergências Git.
- [ ] R1: contratos, outbox/inbox, fachada, logs e piloto de workflow.
- [x] R1-48: verificar por integração o limite, whitelist e fallback do `x-request-id` da API ([relatório](../../docs/r1-48-validacao-correlacao-http.md)); sem alteração de contrato ou runtime; PR #102 consolidado em `08a55e9`, CI run `38022529871` verde.
- [x] R1-49: verificar que logs da API preservam traceId e omitem `Authorization`, cookie e cabeçalho privado enviado na requisição ([relatório](../../docs/r1-49-correlacao-sem-segredos-nos-logs.md)); sem alteração de contrato ou runtime; PR #104 consolidado em `8c86b56`, CI run `38023737212` verde.
- [ ] R2: identidade com coexistência e rollback.
- [ ] R3: customer/CRM e decisão de ciclo/mapeamento de Project.
- [ ] R4–R9: extrair por domínio seguindo roadmap e testes existentes.
- [ ] R10: falhas parciais, replay, reconciliação e aceite integrado.
- [ ] Registrar um ADR por escolha concreta que altere persistência/transporte.

## Fora desta entrega

Implementar serviços, migrar dados reais, consolidar main, trocar login, instalar
broker ou apagar código legado. Essas ações exigem incremento técnico próprio.

## Referências

- [Roadmap](../../docs/roadmap-refatoracao.md)
- [Registro de features](../../docs/registro-features.md)
- [Definition of Done](../../docs/definition-of-done.md)
- [ADR-005](../../docs/adr/ADR-005-refatoracao-gradual-servicos.md)

# Moura Solar Platform

Nova plataforma integrada de CRM, propostas, contratos, financeiro, engenharia,
suprimentos, instalações e pós-venda da Moura Solar.

## Início rápido

Requisitos: Docker com Compose v2 e Git.

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
```

Acessos locais padrão:

- web: `http://localhost:3000`;
- API: `http://localhost:3001/api/v1`;
- health: `http://localhost:3001/api/v1/health/ready`;
- MinIO: `http://localhost:9001`.

As portas externas podem ser alteradas no `.env` sem mudar a comunicação entre
os containers. Para acompanhar a inicialização:

```bash
docker compose logs -f api web migrate postgres
```

Os volumes persistem entre reconstruções. Não use `docker compose down -v` sem
pretender apagar os dados locais.

Após subir o ambiente, configure os segredos e crie o administrador com
`pnpm identity:bootstrap`. Consulte [Operação do M1](docs/m1-operacao.md) para
primeiro acesso, convites, recuperação e testes. A documentação OpenAPI está em
`http://localhost:3001/api/v1/docs`.

## Desenvolvimento sem containers da aplicação

Com PostgreSQL e MinIO disponíveis, configure `.env` para os endereços acessíveis
pela máquina e execute:

```bash
pnpm install
pnpm db:generate
pnpm dev
```

## Estado do projeto

O plano histórico registra a fundação executável e os marcos M1 a M10 como
implementados e validados na época. Essa declaração não atesta consolidação na
`main` nem liberação produtiva. O [R0 em branch](docs/r0-baseline-2026-10-08.md)
inventariou capacidades e repetiu as verificações pertinentes; CI remoto passou
no PR #22, mesclado em `feat/proposal-visual-clarity`. A revisão formal do
baseline e a consolidação em `main` seguem pendentes. O
[incremento R1-01](docs/r1-contratos-integracao-2026-10-08.md) foi mesclado
nessa branch e implantado localmente. O
[R1-02](docs/r1-correlacao-import-outbox-2026-10-08.md) foi consolidado e
implantado localmente, sem publicação ou consumidor ativo. O
[R1-03](docs/r1-versionamento-outbox-import-2026-10-08.md) foi mesclado e
liberado somente no Compose local; versiona metadados do outbox existente sem
alterar payloads ou ativar o worker.
O [R1-04](docs/r1-validacao-eventos-import-2026-10-08.md) foi consolidado no
PR #28: valida runtime os dois payloads conhecidos, sem ligar consumidor ou OCR;
por isso não exigiu deploy local.
O [R1-05](docs/r1-inventario-integracao-2026-10-08.md) documenta o inventário
encontrado de auditoria, outbox de importação e projeções, sem ativar consumidor.

Capacidades registradas no plano histórico:

- **M1:** Identidade, Autenticação, Perfis, Sessões e RBAC (SPEC-002)
- **M2:** Comercial: Clientes, Unidades Consumidoras e Oportunidades (SPEC-004)
- **M3:** Engenharia e Design: Consumo Energético, Dimensionamento Fotovoltaico e Custos (SPEC-005)
- **M4:** Propostas Comerciais, Motor de PDF e Aceite Formal (SPEC-006)
- **M5:** Contratos Comerciais, Minutas DOCX/PDF Oficiais, Upload de Assinados e Gate C (SPEC-007)
- **M6:** Governança Financeira, Contas a Receber, Parcelas, Recebimentos, Gate FINANCIAL, Contas a Pagar e Fluxo de Caixa (SPEC-008)
- **M7:** Estoque, Compras, Suprimentos, Depósitos, Custo Médio Ponderado e Reserva de Obras (SPEC-009)
- **M8:** Engenharia, Homologação em Concessionárias, OS de Instalação, Checklists de Campo e Comissionamento (SPEC-010)
- **M9:** Pós-Venda, Suporte com SLA, Garantias, Monitoramento de Usinas e Telemetria (SPEC-011)
- **M10:** Central de Atenção, Motor de Automações com Regras Versionadas, Central de Notificações e Metas (SPEC-012)

Nenhuma funcionalidade é considerada aprovada somente por existir na interface: toda ação respeita regras de negócio, persiste no PostgreSQL com transações atômicas e proteção contra TOCTOU, armazena documentos autenticados no S3/MinIO com AWS Signature V4, produz eventos auditáveis em `audit_events` e atualiza a esteira real do CRM.

## Stack aprovada

- Web responsiva: Next.js, React e TypeScript.
- API: NestJS e TypeScript.
- Banco de dados: PostgreSQL e Prisma.
- Aplicativo futuro: React Native e Expo.
- Monorepo: Turborepo e pnpm.
- Arquivos: armazenamento compatível com S3; MinIO no desenvolvimento.
- Filas: Redis e BullMQ quando houver processamento assíncrono real.
- Infraestrutura local: Docker Compose.

## Princípios

1. A API é a autoridade das regras de negócio.
2. PostgreSQL é a fonte única de verdade.
3. Web completa para todos os perfis, inclusive instaladores.
4. Permissão define acesso; tamanho de tela define somente apresentação.
5. Mudanças críticas são transacionais, auditáveis e idempotentes.
6. A esteira é derivada do estado real do processo.
7. Cada funcionalidade nasce de uma SPEC aprovada e termina com testes.

## Especificações

- [SPEC-000 — Arquitetura e padrões de engenharia](specs/SPEC-000-arquitetura/spec.md)
- [SPEC-001 — Jornada do cliente](specs/SPEC-001-jornada-cliente/spec.md)
- [Estados e transições](specs/SPEC-001-jornada-cliente/estados-e-transicoes.md)
- [Responsabilidades e gates](specs/SPEC-001-jornada-cliente/responsabilidades-e-gates.md)
- [Fatia vertical inicial](specs/SPEC-001-jornada-cliente/fatia-vertical-001.md)
- [Glossário de domínio](specs/SPEC-001-jornada-cliente/glossario.md)
- [SPEC-002 — Identidade e permissões](specs/SPEC-002-identidade-permissoes/spec.md)
- [SPEC-003 — Design system e arquitetura de informação](specs/SPEC-003-design-system-ia/spec.md)
- [Mapa de navegação](specs/SPEC-003-design-system-ia/mapa-navegacao.md)
- [SPEC-004 — Clientes e oportunidades](specs/SPEC-004-clientes-oportunidades/spec.md)
- [Modelo de dados comercial](specs/SPEC-004-clientes-oportunidades/modelo-dados.md)
- [Contrato inicial da API comercial](specs/SPEC-004-clientes-oportunidades/api.md)
- [SPEC-005 — Levantamento, dimensionamento e custos](specs/SPEC-005-dimensionamento-custos/spec.md)
- [Modelo técnico e comercial](specs/SPEC-005-dimensionamento-custos/modelo-dados.md)
- [Regras de cálculo e unidades](specs/SPEC-005-dimensionamento-custos/calculos.md)
- [Automações de dimensionamento](specs/SPEC-005-dimensionamento-custos/automacoes.md)
- [SPEC-006 — Propostas e aceite comercial](specs/SPEC-006-propostas/spec.md)
- [Modelo de dados de propostas](specs/SPEC-006-propostas/modelo-dados.md)
- [Estrutura do PDF comercial](specs/SPEC-006-propostas/pdf.md)
- [SPEC-007 — Contratos e documentos](specs/SPEC-007-contratos-documentos/spec.md)
- [Modelo de contratos](specs/SPEC-007-contratos-documentos/modelo-dados.md)
- [Templates, campos e cláusulas](specs/SPEC-007-contratos-documentos/templates-clausulas.md)
- [SPEC-008 — Financeiro](specs/SPEC-008-financeiro/spec.md)
- [Modelo de dados financeiro](specs/SPEC-008-financeiro/modelo-dados.md)
- [Cálculos, conciliação e indicadores](specs/SPEC-008-financeiro/calculos-indicadores.md)
- [SPEC-009 — Estoque e compras](specs/SPEC-009-estoque-compras/spec.md)
- [Modelo de dados de estoque](specs/SPEC-009-estoque-compras/modelo-dados.md)
- [Movimentos, saldos e custo médio](specs/SPEC-009-estoque-compras/movimentos-custeio.md)
- [SPEC-010 — Engenharia e instalação](specs/SPEC-010-engenharia-instalacao/spec.md)
- [Fluxo de engenharia e homologação](specs/SPEC-010-engenharia-instalacao/engenharia-homologacao.md)
- [Checklist e operação de campo](specs/SPEC-010-engenharia-instalacao/campo-checklist.md)
- [SPEC-011 — Pós-venda, suporte e desempenho](specs/SPEC-011-pos-venda/spec.md)
- [Modelo de dados de pós-venda](specs/SPEC-011-pos-venda/modelo-dados.md)
- [Monitoramento e operação de suporte](specs/SPEC-011-pos-venda/monitoramento-suporte.md)
- [SPEC-012 — Automações, notificações, gestão e observabilidade](specs/SPEC-012-automacoes-gestao/spec.md)
- [Modelo de dados de automações e gestão](specs/SPEC-012-automacoes-gestao/modelo-dados.md)
- [Indicadores, alertas e observabilidade](specs/SPEC-012-automacoes-gestao/indicadores-observabilidade.md)

## Decisões arquiteturais

- [ADR-001 — Monólito modular](docs/adr/ADR-001-monolito-modular.md)
- [ADR-002 — Web completa e aplicativo complementar](docs/adr/ADR-002-web-e-mobile.md)

## Implementação

- [Plano de implementação](docs/plano-implementacao.md)
- [Execução da primeira fatia vertical](docs/fatia-vertical-001-execucao.md)
- [Definition of Done](docs/definition-of-done.md)

## Evolução de UX, documentos e contas — plano histórico

O plano abaixo registra a proposta original e seus lotes. Há módulos de dossiê e
importação no checkout de referência, mas políticas operacionais, PoC e execução
do consumidor ainda exigem verificação em R0/R5. A proposta não altera o status
histórico dos marcos acima.

- [Plano incremental e baseline](docs/plano-evolucao-ux-documentos-contas.md)
- [Matriz de rastreabilidade](docs/matriz-rastreabilidade-evolucao.md)
- [Revisão e validações documentais](docs/revisao-evolucao-ux-documentos-contas.md)
- [SPEC-013 — Dossiê documental](specs/SPEC-013-dossie-documental/spec.md)
- [SPEC-014 — Importação assistida de contas](specs/SPEC-014-importacao-contas-energia/spec.md)
- [SPEC-015 — UX da jornada operacional](specs/SPEC-015-ux-jornada-operacional/spec.md)
- [ADR-003 — Dossiê e persistência documental](docs/adr/ADR-003-dossie-e-persistencia-documental.md)
- [ADR-004 — Importação assistida durável](docs/adr/ADR-004-importacao-assistida-duravel.md)

## Refatoração evolutiva — direção de 07/10/2026

Manter a plataforma existente e o Material Design aplicado. A arquitetura atual
continua sendo NestJS modular; a separação em serviços é incremental e planejada,
sem reescrita integral ou declaração de prontidão produtiva a partir de M0–M10.

- [Roadmap vigente e sequência R0–R13](docs/roadmap-refatoracao.md)
- [Registro completo de features e evidências](docs/registro-features.md)
- [SPEC-016 — Refatoração e fronteiras](specs/SPEC-016-refatoracao-evolutiva/spec.md)
- [SPEC-017 — Catálogo completo](specs/SPEC-017-catalogo-produtos/spec.md)
- [SPEC-018 — Localização, consumo, cálculo e preço](specs/SPEC-018-localizacao-consumo-preco/spec.md)
- [SPEC-019 — Eventos e plataforma de dados](specs/SPEC-019-eventos-dados/spec.md)
- [ADR-005 — Migração gradual para serviços](docs/adr/ADR-005-refatoracao-gradual-servicos.md)
- [ADR-006 — Continuidade do Material Design](docs/adr/ADR-006-material-design.md)

Os estados históricos e as referências de baseline dos documentos anteriores
continuam como evidência da época. O roadmap vigente define prioridades futuras;
os documentos de domínio continuam definindo regras. A última instrução explícita
do usuário prevalece em caso de divergência.

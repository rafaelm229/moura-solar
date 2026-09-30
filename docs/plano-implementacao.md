# Plano de implementação

## Status

Pronto para execução após aprovação.

## Estratégia

A plataforma será construída em fatias verticais pequenas. Cada fatia atravessa
interface, API, banco, autorização, auditoria e testes. Um módulo não será
considerado pronto por possuir apenas telas ou tabelas.

O desenvolvimento começa validando os riscos que quebraram a versão anterior:

- fonte única de verdade no PostgreSQL;
- sincronização entre aparelhos;
- transições reais da esteira;
- separação de domínios;
- permissões na API;
- responsividade sem funções incompletas;
- migrações e execução Docker reproduzíveis.

## Marcos

| Marco | Entrega demonstrável                                    | Dependências                    | Status    |
| ----- | ------------------------------------------------------- | ------------------------------- | --------- |
| M0    | Monorepo, ambientes, banco, CI e convenções             | SPEC-000                        | Concluído |
| M1    | Login, equipe, sessões e permissões                     | M0, SPEC-002                    | Concluído |
| M2    | Cliente, unidade consumidora, oportunidade e atividade  | M1, SPEC-004                    | Concluído |
| M3    | Consumo, dimensionamento solar e composição de custos   | M2, SPEC-005                    | Concluído |
| M4    | Propostas comerciais, motor PDF institucional e aceite  | M3, SPEC-006                    | Concluído |
| M5    | Contratos comerciais, minutas DOCX/PDF, upload e Gate C | M4, SPEC-007                    | Concluído |
| M6    | Contas, parcelas, recebimentos, comissões e margem      | M5, SPEC-008                    | A iniciar |
| M7    | Materiais, depósitos, compras, reservas e custo médio   | M6, SPEC-009                    | Planejado |
| M8    | Engenharia, homologação, agenda e instalação            | M7, SPEC-010                    | Planejado |
| M9    | Pós-venda, garantia, monitoramento e desempenho         | M8, SPEC-011                    | Planejado |
| M10   | Automações, indicadores e operação assistida            | M2–M9, SPEC-012                 | Planejado |
| M11   | Aplicativo React Native complementar                    | Web operacional e APIs estáveis | Planejado |

## M0 — Fundação executável

### Estrutura

```text
apps/
  api/
  web/
  worker/
packages/
  api-client/
  contracts/
  database/
  business-rules/
  design-tokens/
  observability/
  eslint-config/
  typescript-config/
  test-utils/
infra/
docs/
specs/
```

### Entregas

- pnpm, Turborepo e TypeScript em modo estrito;
- NestJS, Next.js e worker mínimo;
- PostgreSQL e armazenamento S3 compatível no Docker Compose;
- Redis somente quando o primeiro job assíncrono for implementado;
- Prisma com migração inicial e seed de desenvolvimento;
- configuração validada por ambiente;
- health checks de disponibilidade e prontidão;
- lint, formatação, typecheck, testes e build no CI;
- OpenAPI e cliente TypeScript gerado;
- logs estruturados com `traceId` e tratamento uniforme de erros;
- testes mínimos de integração usando banco real isolado.

### Portas

Portas publicadas são configuráveis por `.env`, com padrões documentados. Somente
web/API e consoles explicitamente necessários são expostos ao host. Comunicação
entre containers usa nomes internos e portas do serviço, evitando depender da
porta publicada. O Compose deve detectar prontidão antes de iniciar migrações ou
API e tolerar a inicialização do PostgreSQL.

### Saída de M0

Um novo desenvolvedor clona o repositório, copia o arquivo de exemplo, inicia o
Compose e acessa web, health check e documentação da API. Reiniciar containers
preserva os dados; derrubar volumes exige comando explícito e documentado.

## M1 — Identidade e equipe

- organização inicial e administrador por bootstrap seguro;
- login, logout, refresh rotativo e recuperação de senha;
- usuários, convites, bloqueio e revogação de sessões;
- papéis e permissões granulares;
- proteção de rotas web e autorização obrigatória na API;
- auditoria de eventos de acesso e administração;
- layouts responsivos de autenticação e equipe.

Saída: administrador cria um vendedor, o vendedor entra em outro aparelho e não
acessa funções administrativas.

## M2 e M3 — Primeira fatia comercial completa

M2 e M3 formam a primeira liberação interna. A ordem detalhada está em
`docs/fatia-vertical-001-execucao.md`.

Saída: no desktop, o vendedor cria cliente e proposta; no celular, outro usuário
autorizado visualiza exatamente os mesmos dados e o mesmo PDF.

## M4 a M9

Cada marco seguinte só começa após seus gates anteriores estarem cobertos por
testes. Integrações serão realizadas por casos de uso e eventos, não por leitura
direta de tabelas privadas.

- M4 congela versões contratuais e evidencia aceite.
- M5 torna a aprovação financeiramente operacional.
- M6 conecta custo, disponibilidade, reserva e compra.
- M7 executa engenharia e instalação com rastreabilidade de campo.
- M8 fecha garantia, suporte e acompanhamento.
- M9 adiciona automações depois que eventos e estados estiverem estáveis.

## Estratégia de branches e entregas

- `main` sempre implantável e protegida.
- Branch curta por item: `feat/...`, `fix/...`, `chore/...`.
- Pull request pequena, vinculada à SPEC e ao critério de aceite.
- Migração de banco acompanha o código que a utiliza.
- Revisão exige testes, autorização, responsividade e impacto de dados.
- Tag por release interna; changelog gerado a partir dos PRs.
- Segredos nunca entram no repositório.

## Ambientes

| Ambiente    | Uso                        | Dados                              |
| ----------- | -------------------------- | ---------------------------------- |
| Local       | Desenvolvimento por pessoa | Seed fictícia                      |
| CI          | Testes descartáveis        | Gerados durante o pipeline         |
| Homologação | Aceite operacional         | Fictícios ou anonimizados          |
| Produção    | Operação real              | Protegidos, auditados e com backup |

Migrações são aplicadas por etapa controlada de deploy. `prisma db push` não será
usado como mecanismo de produção.

## Política para a versão anterior

A versão antiga será tratada como protótipo de descoberta, não como base
arquitetural. Serão reaproveitados somente ativos que passarem por revisão:

- identidade visual, tokens e referências de layout;
- textos, modelos de PDF e cláusulas validadas;
- regras de cálculo confirmadas;
- dados mestres que possam ser saneados e importados;
- aprendizados de fluxo e testes operacionais.

Componentes com regra de negócio local, armazenamento no navegador, entidades
duplicadas ou arquivos monolíticos não serão copiados.

## Ordem de implantação

1. Homologação automática a cada merge em `main`.
2. Aceite interno por roteiro reproduzível.
3. Produção inicialmente restrita à equipe piloto.
4. Importação validada dos dados necessários.
5. Expansão gradual por perfil e módulo usando feature flags.
6. Desativação da versão anterior somente após reconciliação e plano de retorno.

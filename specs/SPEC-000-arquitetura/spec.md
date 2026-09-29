# SPEC-000 — Arquitetura e padrões de engenharia

**Status:** Aprovada  
**Versão:** 0.2.0  
**Escopo:** transversal  
**Responsáveis:** Produto e Engenharia

## 1. Objetivo

Definir a fundação técnica e os critérios obrigatórios da Moura Solar Platform.
Esta SPEC é normativa: módulos futuros não podem contrariá-la sem um ADR aprovado.

## 2. Problemas que esta arquitetura deve impedir

- Dados mantidos somente no navegador ou em um aparelho.
- Cadastros duplicados representando a mesma entidade.
- Campos de status que não movimentam o processo real.
- Regras de negócio espalhadas em componentes de interface.
- Alterações simultâneas sobrescrevendo informações silenciosamente.
- Menus ocultos sem proteção equivalente na API.
- Telas desktop quebradas por estilos globais ou larguras fixas.
- Fluxos mobile incompletos que dependem do futuro aplicativo nativo.
- Arquivos extensos concentrando múltiplos domínios.

## 3. Escopo

### Incluído

- Arquitetura lógica da plataforma.
- Fronteiras dos módulos.
- Stack e organização do monorepo.
- Persistência, transações, concorrência e auditoria.
- Autenticação e autorização.
- Contrato entre API e clientes.
- Padrões de frontend responsivo.
- Estratégia de testes e entrega contínua.
- Observabilidade, arquivos e trabalhos assíncronos.

### Fora desta SPEC

- Regras comerciais detalhadas.
- Fórmulas definitivas de dimensionamento fotovoltaico.
- Cláusulas contratuais.
- Regras fiscais, bancárias ou de emissão de boletos.
- Implementação do aplicativo React Native.

## 4. Arquitetura aprovada

### 4.1 Estilo

O backend começará como **monólito modular**. Cada domínio terá fronteira explícita,
casos de uso próprios e acesso controlado aos dados. Não serão adotados
microsserviços na primeira versão.

### 4.2 Aplicações

```text
apps/
├── api/       NestJS
├── web/       Next.js
├── mobile/    React Native + Expo (fase posterior)
└── worker/    consumidores assíncronos quando necessários
```

### 4.3 Pacotes compartilhados

```text
packages/
├── api-client/
├── contracts/
├── database/
├── business-rules/
├── design-tokens/
├── observability/
├── eslint-config/
├── typescript-config/
└── test-utils/
```

Não haverá pacote universal de componentes visuais entre web e mobile. Serão
compartilhados contratos, regras puras, tokens e utilitários; cada plataforma
manterá componentes adequados à sua interação.

### 4.4 Módulos iniciais da API

```text
identity
customers
crm
proposals
contracts
finance
engineering
inventory
purchasing
installations
after-sales
documents
notifications
audit
```

Um módulo não poderá consultar diretamente tabelas privadas de outro módulo para
contornar seus casos de uso. Integrações internas ocorrerão por interfaces de
aplicação e eventos de domínio/aplicação.

## 5. Fonte de verdade e consistência

1. PostgreSQL é a fonte única de verdade operacional.
2. Local Storage, IndexedDB e cache não podem ser a fonte primária dos registros.
3. Toda mutação ocorre pela API autenticada.
4. Operações com múltiplos efeitos obrigatórios usam uma única transação.
5. Processos assíncronos usam padrão de outbox para não perder eventos após commit.
6. Comandos sujeitos a repetição aceitam chave de idempotência.
7. Entidades mutáveis terão controle de versão para detectar concorrência otimista.
8. Exclusão de registros de negócio será lógica quando necessária para auditoria.

Exemplo: aprovar uma proposta deve, atomicamente, alterar a proposta, atualizar a
oportunidade, criar a próxima atividade e registrar auditoria. Falha em qualquer
parte reverte toda a operação.

## 6. Contrato da API

- REST versionada em `/api/v1`.
- OpenAPI é o contrato publicável da API.
- Clientes TypeScript serão gerados; não serão escritos manualmente em duplicidade.
- Entrada validada no limite da API.
- Erros seguem formato estável com código legível por máquina.
- Paginação, ordenação e filtros usam convenções únicas.
- Datas são transmitidas em ISO 8601; valores monetários usam decimal, nunca float.
- Identificadores externos não expõem sequências previsíveis.

Formato mínimo de erro:

```json
{
  "code": "PROPOSAL_INVALID_TRANSITION",
  "message": "A proposta não pode ser aprovada no estado atual.",
  "details": {},
  "traceId": "..."
}
```

## 7. Autenticação e autorização

- Senhas protegidas com algoritmo moderno e parâmetros revisáveis.
- Access token de curta duração e refresh token rotativo.
- Web usa cookies seguros, HttpOnly e SameSite apropriado.
- Mobile futuro usa armazenamento seguro do sistema operacional.
- Sessões podem ser listadas e revogadas por dispositivo.
- Autorização combina papel e permissões granulares.
- Toda autorização é validada na API; esconder botão não é segurança.
- Operações sensíveis registram ator, instante, entidade, ação e contexto.

Perfis iniciais: Administrador, Gerente, Vendedor, Financeiro, Estoquista,
Instalador e Engenharia. Perfis não substituem permissões granulares.

## 8. Web responsiva

### 8.1 Regra central

Todas as operações essenciais estarão disponíveis na aplicação web responsiva.
O aplicativo nativo será complementar e não poderá ser requisito exclusivo para
concluir uma instalação ou outro processo.

### 8.2 Acesso

- Permissão define o que o usuário pode acessar.
- Perfil define prioridades, página inicial e atalhos.
- Dispositivo define somente layout e forma de interação.
- Nenhuma função autorizada será bloqueada por breakpoint.

### 8.3 Faixas de validação

- 360–767 px: celular.
- 768–1023 px: tablet.
- 1024–1439 px: notebook.
- 1440 px ou mais: desktop.

Breakpoints são guias de layout, não regras de autorização.

### 8.4 Critérios mínimos por tela

- Operável por toque, mouse e teclado quando aplicável.
- Sem conteúdo encoberto por barras ou cartões fixos.
- Formulários preservam dados diante de erro recuperável.
- Estados de carregamento, vazio, erro, sucesso e sem permissão.
- A ação primária é clara e não depende apenas de cor.
- Tabelas densas possuem adaptação deliberada para telas estreitas.
- Modais não são usados para fluxos longos no celular.
- Diálogos destrutivos informam objeto e consequência.
- Alvos de toque e contraste seguem critérios de acessibilidade adotados.

## 9. Estratégia de dados no frontend

- TanStack Query gerencia estado remoto.
- Estado remoto não será duplicado em stores globais sem necessidade.
- Formulários usam React Hook Form e schemas compatíveis com os contratos.
- Atualizações otimistas apenas quando houver reversão segura.
- Dados críticos são revalidados após mutações.
- Tempo real será aplicado somente onde houver valor operacional demonstrado.
- O backend sempre decide a transição válida, mesmo que a UI antecipe opções.

## 10. Arquivos e documentos

- Metadados ficam no PostgreSQL; bytes ficam em armazenamento S3 compatível.
- Upload usa URL temporária e validação de tipo, tamanho e autorização.
- Download exige autorização contextual.
- Documentos possuem versão, categoria, entidade vinculada e auditoria.
- Arquivos nunca são tratados como enviados antes da confirmação de persistência.

## 11. Processamento assíncrono

Redis e BullMQ serão adicionados somente para tarefas justificadas, como geração
de documentos, processamento de imagens, notificações e integrações. Jobs deverão
ser idempotentes, observáveis e possuir política de retentativa e fila de falhas.

## 12. Testes obrigatórios

- Unitários: regras puras e transições.
- Integração: casos de uso, PostgreSQL e transações.
- Contrato: OpenAPI e cliente gerado.
- E2E web: jornadas críticas com Playwright.
- Responsividade: cenários em celular, tablet e desktop.
- Autorização: matriz positiva e negativa por permissão.
- Concorrência: atualização simultânea e idempotência.
- Migrações: aplicação em banco vazio e atualização desde versão suportada.

Nenhuma etapa é concluída somente com teste manual.

## 13. Observabilidade

- Logs estruturados com `traceId`, usuário e organização quando permitido.
- Métricas de erro, latência e filas.
- Health checks separados para vida e prontidão.
- Dados pessoais e segredos não aparecem em logs.
- Auditoria de negócio não será confundida com log técnico.

## 14. CI e política de entrega

Cada Pull Request deverá executar:

1. instalação determinística;
2. lint e formatação;
3. verificação TypeScript;
4. testes unitários e de integração relevantes;
5. build da API e web;
6. validação das migrations;
7. testes E2E críticos quando aplicável.

`main` deverá permanecer implantável. Mudanças usam branches curtas, Pull Request
e commits convencionais. Segredos ficam fora do Git; o repositório contém apenas
`.env.example`.

## 15. Definition of Done transversal

Uma funcionalidade só está pronta quando:

- sua SPEC está aprovada e rastreada no Pull Request;
- regras estão na camada correta;
- persistência é central e transacional quando necessário;
- autorização existe na API e na experiência visual;
- auditoria foi considerada;
- funciona nas quatro faixas de tela definidas;
- estados excepcionais foram tratados;
- testes automatizados passam;
- OpenAPI e documentação foram atualizadas;
- não cria duplicação de fonte de verdade.

## 16. Critérios de aprovação desta SPEC

- [x] Stack e monorepo aprovados.
- [x] Monólito modular aprovado.
- [x] API como autoridade das regras aprovada.
- [x] Web completa para todos os perfis aprovada.
- [x] Aplicativo nativo complementar aprovado.
- [x] Estratégia de transações, auditoria e concorrência aprovada.
- [x] Política de testes e Pull Requests aprovada.

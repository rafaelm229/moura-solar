# Plano de migração visual

## 1. Estratégia

Migrar em fatias verticais. Cada lote preserva API, regras, permissões, persistência
e testes. Não substituir o frontend inteiro em uma única alteração.

## 2. Pré-condições

- armazenamento de documentos validado e persistente;
- riscos críticos M1–M6 avaliados;
- CI obrigatório e verde;
- branch própria;
- baseline E2E e screenshots atuais;
- rotas e contratos da API conhecidos.

## 3. Lotes

### Lote 0 — documentação

- aprovar SPEC-003 v0.2;
- aprovar ADR-003;
- registrar referência Figma;
- alinhar inventário e critérios.

### Lote 1 — fundação visual

- implementar tokens;
- instalar fontes com estratégia compatível com Next.js;
- criar primitives;
- criar catálogo/testes de componentes;
- configurar acessibilidade e regressão visual.

### Lote 2 — shell e rotas

- AppShell;
- rotas reais;
- layouts aninhados;
- sidebar;
- topbar;
- navegação mobile;
- autorização e deep links.

### Lote 3 — M1

- login, convite e recuperação;
- equipe, papéis, sessões e auditoria;
- validar 360, 768, 1024 e 1440 px.

### Lote 4 — M2

- clientes;
- oportunidades;
- atividades;
- funil real e transições por comando.

### Lote 5 — M3

- consumo;
- vistoria;
- catálogo;
- dimensionamento;
- custos, markup, margem e alçadas.

### Lote 6 — M4 e M5

- propostas, versões, PDF, envio e aceite;
- contratos, DOCX/PDF, documentos, conferência e Gate C.

### Lote 7 — M6

- planos de pagamento, parcelas e títulos a receber;
- recebimentos, alocações e Gate Financeiro (Gate FINANCIAL);
- contas a pagar, liquidações e comissões;
- margem realizada vs. projetada e fluxo de caixa consolidado.

### Lote 8 — dashboard

Conectar o dashboard somente após métricas possuírem origem real e autorização.

## 4. Testes por lote

- lint e typecheck;
- unitários dos componentes alterados;
- integração das mutações afetadas;
- E2E das jornadas do módulo;
- autorização positiva e negativa;
- screenshots 360, 768, 1024 e 1440;
- axe/teclado nos fluxos principais;
- build de produção.

## 5. Regra de rollback

Mudanças visuais não alteram schema ou regra de negócio no mesmo commit. Quando
necessário, usar feature flag ou migração por rota para permitir retorno seguro.

## 6. Definition of Done visual

- fidelidade aprovada ao Figma;
- comportamento conforme SPECs funcionais;
- sem mocks em produção;
- dados persistidos e sincronizados;
- rotas restauráveis;
- sem regressões M1–M6;
- responsividade e acessibilidade aprovadas;
- diff visual revisado conscientemente.

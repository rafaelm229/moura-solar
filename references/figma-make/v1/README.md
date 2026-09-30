# Referência visual — Figma Make v1

## Identificação

- Artefato original: `Moura Solar CRM_ERP Design.zip`
- Data de consolidação: 30/09/2026
- Finalidade: referência visual para a SPEC-003 v0.2
- Stack do protótipo: React 19, Vite 8, Tailwind CSS 4 e Recharts

## Escopo detalhado

- shell desktop;
- shell mobile;
- sidebar recolhível;
- topbar;
- navegação inferior e menu `Mais`;
- dashboard;
- funil;
- clientes;
- propostas;
- projetos;
- financeiro;
- estoque;
- configurações.

## Escopo incompleto

As seguintes áreas aparecem somente como placeholders ou não possuem fluxo final:

- oportunidades;
- atividades;
- engenharia;
- agenda;
- instalações;
- pós-venda;
- movimentações;
- compras;
- fornecedores;
- contas a receber e pagar;
- comissões;
- fluxo de caixa;
- equipe, papéis e auditoria;
- login, convite, recuperação e sessões;
- dimensionamento detalhado;
- contratos e documentos.

## Regra de utilização

O protótipo define intenção visual, não comportamento funcional. Não utilizar como
fonte de verdade para estados, cálculos, gates, permissões, rotas, persistência ou API.

Antes de portar qualquer trecho:

1. mapear para a SPEC funcional;
2. remover mocks;
3. substituir estado local por rota/query/API adequada;
4. converter literais em tokens;
5. decompor em componente compartilhado;
6. adicionar acessibilidade;
7. testar responsividade;
8. preservar autorização e auditoria.

## Arquivos que podem ser consultados

- `src/index.css` para direção de tokens;
- `src/components/Icons.tsx` para SVGs;
- `src/components/Sidebar.tsx` para composição visual;
- `src/components/Topbar.tsx` para composição visual;
- `src/components/MobileNav.tsx` para navegação móvel;
- `src/pages/*` para layouts e densidade.

## Arquivos que não entram na aplicação

- `.figma/make/*`;
- configuração Vite;
- mocks e listas estáticas;
- `App.tsx` como roteador;
- dependências exclusivas do protótipo sem avaliação.


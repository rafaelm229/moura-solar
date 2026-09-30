# Mapeamento Figma Make → aplicação

## 1. Material analisado

Pacote: `Moura Solar CRM_ERP Design.zip`  
Stack do protótipo: React 19, Vite 8, Tailwind CSS 4 e Recharts.  
Escopo observado: 36 arquivos, aproximadamente 3.810 linhas de UI.

## 2. Reuso permitido

| Elemento | Tratamento |
|---|---|
| paleta e tipografia | converter em tokens oficiais |
| ícones SVG | revisar licença, semântica e acessibilidade; portar |
| sidebar/topbar | decompor e integrar ao App Router/RBAC |
| navegação mobile | tornar destinos dependentes do perfil |
| cards e métricas | transformar em componentes compartilhados |
| gráficos | conectar a dados reais e oferecer alternativa textual |
| Kanban | refletir estados/gates reais e oferecer lista acessível |
| tabelas/filtros | integrar query, paginação e permissões reais |
| composições de página | usar como referência visual |

## 3. Elementos que não entram diretamente

- `App.tsx` como shell definitivo;
- `currentPage` e navegação por `useState`;
- `INITIAL_OPPS` e demais mocks;
- nomes, valores e indicadores fictícios;
- botões sem comandos reais;
- estilos inline repetidos;
- mutações somente locais;
- Vite como runtime da aplicação;
- scripts internos `.figma/make`;
- placeholders como telas aprovadas.

## 4. Diferenças arquiteturais

| Figma Make | Aplicação final |
|---|---|
| Vite SPA | Next.js App Router |
| estado local de página | rotas reais e layouts aninhados |
| dados simulados | API NestJS e PostgreSQL |
| menu fixo | menu filtrado por permissões efetivas |
| dois modos de viewport | mobile, tablet, notebook e desktop |
| estilos literais | design tokens e componentes |
| ações demonstrativas | comandos idempotentes e auditáveis |
| gráficos decorativos | métricas rastreáveis e acessíveis |

## 5. Critérios de fidelidade

A migração deve preservar:

- atmosfera escura e contraste geral;
- amarelo solar como ação primária;
- hierarquia das superfícies;
- densidade do desktop;
- clareza dos cartões mobile;
- sidebar agrupada;
- topbar com busca e criação rápida;
- navegação inferior e menu completo;
- estilo de métricas, status e gráficos.

Pode divergir para cumprir acessibilidade, responsividade, domínio ou desempenho.

## 6. Controle de referência

Capturas aprovadas devem ser versionadas como baseline visual. O código exportado
permanece isolado em `references/figma-make/v1` e não é dependência de produção.


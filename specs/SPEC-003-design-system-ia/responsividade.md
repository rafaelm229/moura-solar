# Responsividade

## 1. Faixas de referência

| Faixa | Largura | Comportamento |
|---|---:|---|
| Mobile compacto | 360–389 px | uma coluna, navegação inferior |
| Mobile amplo | 390–767 px | uma coluna, maior respiro |
| Tablet | 768–1023 px | uma ou duas colunas, drawer/rail |
| Notebook | 1024–1439 px | sidebar compacta, maior densidade |
| Desktop | 1440–1919 px | sidebar persistente, 12 colunas |
| Desktop amplo | ≥1920 px | conteúdo limitado por legibilidade |

Breakpoints são referências, não detecção JavaScript de dispositivo. Preferir CSS,
container queries e composição responsiva. JavaScript só quando o comportamento não
puder ser expresso de forma segura em CSS.

## 2. Mobile

- topbar de 56–64 px;
- navegação inferior com safe area;
- conteúdo reserva espaço para elementos fixos;
- menus secundários em bottom sheet;
- formulários em uma coluna;
- filtros em tela cheia ou sheet;
- cards com ação primária visível;
- tabelas convertidas em cartões;
- Kanban com lista por padrão e quadro opcional rolável;
- nenhuma interação depende de hover.

## 3. Tablet

- navegação lateral compacta ou drawer;
- suporte explícito a retrato e paisagem;
- mestre-detalhe quando melhora a tarefa;
- gráficos e métricas em duas colunas quando houver espaço;
- tabelas preservam somente colunas essenciais e oferecem detalhe.

## 4. Notebook e desktop

- sidebar de 264/64 px;
- topbar com busca e criação rápida;
- dashboards em grid de 12 colunas;
- tabelas completas;
- drawers para edição curta;
- formulários limitados em largura;
- conteúdo não deve gerar grandes áreas vazias por largura fixa incorreta.

## 5. Viewports de aceite

Validar no mínimo:

- 360 × 800;
- 390 × 844;
- 768 × 1024;
- 1024 × 768;
- 1280 × 720;
- 1366 × 768;
- 1440 × 900;
- 1920 × 1080.

Também validar zoom 80%, 100%, 125%, 150% e 200% conforme aplicável.

## 6. Regras de overflow

- `overflow-x` global não pode esconder defeitos;
- barra fixa nunca cobre último item, botão ou mensagem;
- rolagem horizontal só em conteúdo comparativo declarado;
- menus, popovers e drawers permanecem dentro do viewport;
- textos longos possuem wrap ou truncamento com acesso ao conteúdo completo.

## 7. Diferença em relação ao protótipo Figma

O protótipo alterna mobile/desktop em 768 px via `window.innerWidth`. A aplicação final
deve implementar tablet deliberadamente e evitar renderizações divergentes por medição
imperativa sempre que CSS resolver o problema.


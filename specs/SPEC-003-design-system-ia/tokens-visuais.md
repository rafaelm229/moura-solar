# Tokens visuais — versão 0.2

## 1. Regra de uso

Tokens pertencem a `packages/design-tokens`. Módulos não devem espalhar cores,
fontes, raios, sombras ou espaçamentos literais. Nomes devem expressar semântica,
não somente aparência.

## 2. Cores

| Token                       |     Valor | Uso                                                       |
| --------------------------- | --------: | --------------------------------------------------------- |
| `color.background.base`     | `#090B0A` | fundo principal                                           |
| `color.surface.default`     | `#111412` | shell e superfícies principais                            |
| `color.surface.card`        | `#161A17` | cards e painéis                                           |
| `color.surface.elevated`    | `#1C211D` | menus, drawers e elevação                                 |
| `color.border.default`      | `#29302B` | bordas e divisores                                        |
| `color.border.subtle`       | `#1E2420` | separadores discretos                                     |
| `color.brand.solar`         | `#FFD400` | ação primária e seleção                                   |
| `color.brand.solarHover`    | `#E6BE00` | hover da ação primária                                    |
| `color.brand.solarPressed`  | `#C9A800` | estado pressionado                                        |
| `color.brand.solarMuted`    | `#3A3200` | fundo selecionado                                         |
| `color.brand.green`         | `#26D866` | geração, sucesso e tendência positiva                     |
| `color.brand.institutional` | `#087443` | identidade institucional secundária                       |
| `color.status.info`         | `#3B82F6` | informação                                                |
| `color.status.success`      | `#26D866` | sucesso                                                   |
| `color.status.warning`      | `#FF9F1C` | atenção                                                   |
| `color.status.danger`       | `#FF4D57` | erro e destrutivo                                         |
| `color.text.primary`        | `#F5F7F5` | texto principal                                           |
| `color.text.secondary`      | `#9BA49E` | texto secundário, auxiliar, labels e cabeçalhos de tabela |
| `color.text.disabled`       | `#626A65` | exclusivamente elementos inativos e desabilitados         |
| `color.text.onSolar`        | `#090B0A` | texto sobre amarelo                                       |

Estados semânticos devem possuir fundo suave próprio, mantendo contraste AA.
Cor nunca é o único indicador: usar texto, ícone ou padrão adicional.
Textos informativos (incluindo auxiliares, legendas, rótulos e cabeçalhos `<th>`) devem manter contraste mínimo de 4.5:1 (WCAG 2.2 AA) utilizando `color.text.secondary` ou superior. O token `color.text.disabled` possui contraste de ~3.5:1 e é reservado estritamente para controles nativamente inativos.
Documentos impressos e minutas PDF/DOCX (M4/M5) utilizam folha de estilo dedicada com base clara e contraste para impressão, isolada do tema operacional escuro.

## 3. Tipografia

| Token                  | Valor                                   |
| ---------------------- | --------------------------------------- |
| `font.family.sans`     | Inter, system-ui, sans-serif            |
| `font.family.mono`     | JetBrains Mono, ui-monospace, monospace |
| `font.size.xs`         | 12 px                                   |
| `font.size.sm`         | 14 px                                   |
| `font.size.md`         | 16 px                                   |
| `font.size.lg`         | 18 px                                   |
| `font.size.xl`         | 20 px                                   |
| `font.size.2xl`        | 24 px                                   |
| `font.size.3xl`        | 30 px                                   |
| `font.size.4xl`        | 36 px                                   |
| `font.weight.regular`  | 400                                     |
| `font.weight.medium`   | 500                                     |
| `font.weight.semibold` | 600                                     |
| `font.weight.bold`     | 700                                     |

Valores monetários, kWh, kWp, percentuais e números de série usam numerais tabulares.

## 4. Espaçamento

Escala base de 4 px: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

## 5. Forma

| Token                    | Valor |
| ------------------------ | ----: |
| `radius.sm`              |  6 px |
| `radius.md`              |  8 px |
| `radius.lg`              | 10 px |
| `radius.xl`              | 16 px |
| `radius.sheet`           | 20 px |
| `control.height.compact` | 36 px |
| `control.height.default` | 44 px |
| `control.height.field`   | 48 px |

## 6. Elevação

- cards comuns usam borda, sem sombra pesada;
- menus: `0 8px 24px rgb(0 0 0 / 40%)`;
- cards interativos: `0 8px 32px rgb(0 0 0 / 40%)` no hover;
- amarelo pode usar glow moderado apenas em ação ou energia.

## 7. Movimento

- feedback simples: 100–180 ms;
- drawer e bottom sheet: 220–280 ms;
- easing padrão: `cubic-bezier(0.4, 0, 0.2, 1)`;
- respeitar `prefers-reduced-motion`.

## 8. Grid e largura

- conteúdo geral: até 1440 px quando a tarefa exigir visão ampla;
- formulários: largura legível, normalmente 640–880 px;
- dashboard: 12 colunas no desktop;
- gutters: 16 px mobile, 20 px tablet e 24 px desktop;
- sidebar: 264 px expandida e 64 px recolhida.

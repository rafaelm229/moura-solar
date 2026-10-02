# Responsividade e acessibilidade — SPEC-003

**Status:** Proposta para revisão

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo aprovado; contratos detalhados e aparência final sujeitos à revisão humana.

Requisitos UX-04 e UX-05. A web permanece completa para instaladores.

| Viewport    | Arranjo e verificação                                                      |
| ----------- | -------------------------------------------------------------------------- |
| 360 × 800   | Uma coluna, cartões, menu completo, teclado e câmera; último campo visível |
| 390 × 844   | Mesmos fluxos com área segura e ações sem sobreposição                     |
| 768 × 1024  | Tablet retrato; mestre-detalhe somente com largura útil suficiente         |
| 1024 × 768  | Tablet/notebook paisagem; menu recolhível, modais limitados pela altura    |
| 1366 × 768  | Tabelas operacionais e formulários sem corte vertical                      |
| 1440 × 900  | Menu lateral, comparação de documento e dados                              |
| 1920 × 1080 | Largura controlada de leitura, dashboards fluidos sem ampliação artificial |

Layout depende do espaço útil, não de marca do dispositivo. Sem largura fixa mínima que cause rolagem global. Barras fixas reservam espaço e safe-area; campos e foco continuam visíveis com teclado virtual. Filtros e abas acessíveis por toque, teclado e leitor de tela. Orientação não bloqueada. Campos 16 px; alvos de produto 44 px e preferencialmente 48 px em campo.

Meta: WCAG 2.2 AA. Testar contraste 4.5:1 em texto comum, 3:1 em texto grande e controles essenciais; foco visível não encoberto; sem armadilha de teclado; landmarks, skip link, títulos e nomes acessíveis; mensagens de estado e erros anunciados. Zoom 200% sem perda funcional e reflow equivalente a 320 CSS px/400% quando aplicável. Conteúdo bidimensional excepcional permanece em região própria acessível. Movimento reduzido remove animação dispensável. Autenticação permite gerenciador de senhas e colar.

Esses critérios são derivados da [WCAG 2.2 oficial](https://www.w3.org/TR/WCAG22/), consultada em 02/10/2026. Alvos de 44/48 px são escolha de produto mais exigente que o mínimo AA com exceções; não confundir teste automático com conformidade integral.

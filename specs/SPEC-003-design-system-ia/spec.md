# SPEC-003 — Design system, arquitetura de informação e responsividade

**Status:** Direção Material Design aprovada; detalhes incrementais em revisão

**Versão:** 0.4.0

**Data:** 07/10/2026

**Escopo:** apresentação e navegação da web M1–M10

## Autoridade e histórico

Esta é a única autoridade de design. SPEC-001 e SPECs de domínio continuam responsáveis por estados, cálculos, gates e permissões. SPEC-015 aplica estes padrões à jornada; não define outro design system. O escopo está aprovado; aparência e contratos detalhados permanecem sujeitos à revisão humana.

A main analisada (`a197c80`) contém a versão clara 0.1.0. O histórico acessível contém 0.2.0 nos commits `f03e1fa` e `7c63ee7`, com direção escura Figma. Essa direção está superada para esta evolução; as versões permanecem no Git como histórico, não como autorização atual. A versão 0.3.0 evita reutilizar a numeração abandonada. A versão 0.4.0 registra
em 07/10/2026 a decisão de manter Material Design; ela supera a exclusão de
Material Design da versão 0.3.0 e o experimento Liquid Glass discutido fora do Git. Não restaurar automaticamente arquivos ou CSS daquele ramo.

## Objetivo e exclusões

Organizar trabalho diário com hierarquia clara, mantendo todas as capacidades autorizadas. Não alterar domínio para acomodar estética; não substituir globalmente CSS, framework, autenticação ou módulos. Manter Material Design adaptado à marca, reaproveitando os componentes e tokens
compatíveis já utilizados. A preferência visual não implica instalação automática
de Angular Material, MUI ou qualquer biblioteca. Não introduzir Liquid Glass,
redesign Apple/Linear/Raycast ou tema escuro obrigatório. Sem aplicativo nativo, portal público, novas fórmulas ou aprovação automática de gates.

## Requisitos e aceite

| ID    | Regra                                                                                                                   | Critério verificável                                                                                               |
| ----- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| UX-01 | Superfícies brancas, fundo neutro, verde Moura, solar pontual, tipografia sóbria, bordas discretas e decoração moderada | Três pilotos aprovados com tokens e hierarquia consistentes                                                        |
| UX-02 | Sem emojis; Material Symbols Outlined local e acessível                                                                 | Inventário de ícones, licença e inspeção de telas sem emojis; ações importantes têm texto                          |
| UX-03 | Componentes compartilhados e estados completos                                                                          | Cada componente afetado demonstra loading, vazio, erro, conflito e acesso negado aplicáveis                        |
| UX-04 | Web completa e fluida em sete viewports                                                                                 | Mesmo fluxo autorizado concluído nas sete dimensões, sem conteúdo encoberto                                        |
| UX-05 | WCAG 2.2 AA, teclado, foco, zoom e movimento reduzido                                                                   | Roteiro automático e manual de acessibilidade aprovado                                                             |
| UX-06 | Início, Comercial, Projetos, Suprimentos, Financeiro, Pós-venda                                                         | Inventário M1–M10 preservado com destino e autorização equivalentes                                                |
| UX-07 | Administração secundária; conta separada; pendências diárias                                                            | Pessoas/papéis/equipes/auditoria acessíveis em Configurações; sessões na conta; atenção e notificações no Início   |
| UX-08 | Atalhos mobile por perfil, menu completo                                                                                | Instalador abre OS; vendedor abre atividades; permissão não depende do viewport nem da ordem do array              |
| UX-09 | Rotas Next.js reais e deep links seguros                                                                                | Abrir URL, atualizar, login/retorno, voltar/avançar e filtro preservam contexto                                    |
| UX-10 | Preservar sessão, cache e dados não salvos                                                                              | Refresh concorrente, troca de conta e navegação com formulário sujo não vazam dados nem descartam silenciosamente  |
| UX-11 | Migração gradual e aprovação visual antes de expansão                                                                   | Pilotos cliente, oportunidade e instalação aprovados em mobile/tablet/desktop; rollback por incremento demonstrado |
| UX-12 | Métricas e gráficos contextualizados                                                                                    | Toda métrica informa fonte, período, unidade e atualização; tabela textual equivalente disponível                  |

## Documentos normativos complementares

- [Tokens visuais](tokens-visuais.md).
- [Ícones](icones.md).
- [Componentes e layouts](componentes.md).
- [Mapa de navegação e rotas](mapa-navegacao.md).
- [Responsividade e acessibilidade](responsividade.md).
- [Validação visual e testes](validacao-visual.md).
- [Plano incremental](../../docs/plano-evolucao-ux-documentos-contas.md).
- [Matriz de rastreabilidade](../../docs/matriz-rastreabilidade-evolucao.md).

## Transição

Introduzir tokens sem alterar seletores globais das telas ainda não migradas. Adaptar componentes afetados por responsabilidade (lista, formulário, comando, resumo), preservando hooks e contratos. Financeiro e engenharia exigem decomposição apenas nas superfícies modificadas. Flags de interface não contornam autorização. Cada incremento visual preserva payloads, snapshots e resultados dos testes de domínio; correções de cálculos, gates ou banco ficam em incrementos próprios.

## Continuidade Material Design

Hierarquia, superfícies sólidas, elevação moderada, estados, feedback e padrões
de interação seguem Material Design com a identidade Moura Solar. Reaproveitar
tokens, Material Symbols Outlined, formulários, shell e componentes atuais.
Nenhuma biblioteca será trocada apenas para aderir a um rótulo visual.

Pilotos validam mudanças incrementais e o catálogo PRD-001; não são pré-condição
para redesenhar integralmente M1–M10. A tela Produtos pertence à SPEC-017 e usa os
mesmos padrões. Densidade de tabela não sacrifica legibilidade nem acesso móvel.

Critérios: sem backdrop blur/glass obrigatório; sem CSS global substituído;
sem perda de contraste, foco, ações, sessão ou capacidades entre viewports.
Rotas existentes e o mapa aprovado evoluem com adaptadores de deep links.

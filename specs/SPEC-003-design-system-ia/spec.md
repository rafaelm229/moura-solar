# SPEC-003 — Design system, arquitetura de informação e responsividade

**Status:** Aprovada para implementação incremental  
**Versão:** 0.2.0  
**Escopo:** aplicação web responsiva  
**Referência visual:** Moura Solar CRM/ERP Design — Figma Make, v1  
**Última atualização:** 30/09/2026

## 1. Objetivo

Definir a linguagem visual, a arquitetura de informação e os padrões de interação
da Moura Solar Platform para celular, tablet, notebook e desktop. A interface deve
representar os estados reais da operação e facilitar decisões comerciais, técnicas,
financeiras e de campo.

Esta SPEC é normativa para apresentação e interação. As SPECs de domínio continuam
sendo a autoridade sobre regras de negócio, estados, permissões, cálculos e gates.

## 2. Fontes de verdade

Em caso de conflito, aplicar esta prioridade:

1. SPECs funcionais e regras do domínio;
2. contratos da API e dados persistidos no PostgreSQL;
3. esta SPEC e seus documentos complementares;
4. telas aprovadas do Figma Make;
5. código exportado pelo Figma Make.

O Figma define intenção visual. Seu código não define arquitetura, rotas, estado,
permissões ou regras de negócio.

## 3. Princípios

1. **Processo antes do módulo:** mostrar etapa, responsável, bloqueios e próxima ação.
2. **Fonte única de verdade:** a UI reflete respostas confirmadas pela API.
3. **Comandos explícitos:** aprovar, enviar, contratar e concluir não são edições comuns.
4. **Capacidade independente da tela:** viewport altera apresentação, nunca permissão.
5. **Densidade adaptativa:** mobile prioriza ação; desktop favorece comparação.
6. **Consistência:** mesma ação mantém nome, efeito e semântica em todo o produto.
7. **Segurança perceptível:** ações destrutivas ou irreversíveis exibem alvo e impacto.
8. **Acessibilidade por padrão:** foco, contraste, rótulos e teclado fazem parte do componente.
9. **Estados completos:** loading, vazio, erro, conflito, sucesso e acesso negado são obrigatórios.
10. **Progressão real:** o funil é derivado de estados e gates, nunca de controles visuais isolados.

## 4. Direção visual aprovada

A aplicação adota linguagem operacional escura, com amarelo solar como destaque
primário e verde como confirmação/energia. O fundo escuro reduz brilho em uso de
campo e dá contraste às métricas, desde que todos os componentes atendam WCAG 2.2 AA.

- fundo base quase preto esverdeado;
- superfícies em camadas progressivas;
- amarelo reservado a ações primárias, seleção e energia;
- verde reservado a sucesso, geração e estados positivos;
- vermelho, laranja e azul com uso semântico;
- tipografia Inter para interface;
- JetBrains Mono para métricas, energia, potência e valores financeiros;
- cantos moderados, bordas discretas e sombras controladas;
- ícones lineares consistentes.

Valores normativos estão em [tokens-visuais.md](tokens-visuais.md).

## 5. Arquitetura da aplicação

As áreas principais são:

```text
Visão geral
Comercial
  Funil | Clientes | Oportunidades | Atividades | Propostas
Operação
  Projetos | Engenharia | Agenda | Instalações | Pós-venda
Suprimentos
  Estoque | Movimentações | Compras | Fornecedores | Inventários
Financeiro
  Visão financeira | Receber | Pagar | Comissões | Fluxo de caixa
Administração
  Equipe | Papéis | Auditoria | Cadastros | Configurações
Conta
  Perfil | Sessões
```

Itens sem permissão não aparecem, mas a proteção obrigatória permanece na API.
O tamanho da tela não remove áreas autorizadas.

## 6. Navegação

- Desktop: sidebar persistente e recolhível, topbar, busca global e ações contextuais.
- Tablet: sidebar compacta ou drawer, mantendo acesso integral às áreas.
- Mobile: cabeçalho compacto, quatro destinos prioritários e item `Mais`.
- `Mais` abre todas as áreas autorizadas agrupadas como no desktop.
- Entidades usam rotas reais, compartilháveis e restauráveis após login.
- `useState` não deve substituir roteamento do Next.js.
- Voltar/avançar, refresh e deep link devem preservar o contexto.

O mapa normativo está em [mapa-navegacao.md](mapa-navegacao.md).

## 7. Contexto unificado do projeto

Um projeto representa a continuidade da mesma jornada e utiliza um identificador comum:

```text
Resumo | Comercial | Proposta | Contrato | Financeiro | Engenharia |
Materiais | Instalação | Documentos | Histórico
```

As abas consultam módulos responsáveis; não criam registros paralelos para preencher a interface.

## 8. Padrões obrigatórios

Toda funcionalidade nova ou migrada deve usar componentes compartilhados para:

- botões e ações;
- campos e validação;
- navegação;
- cards e métricas;
- tabelas e cartões mobile;
- filtros;
- diálogos, drawers e bottom sheets;
- alertas e feedback;
- arquivos e documentos;
- timelines e auditoria;
- gráficos;
- checklists e operação de campo.

O catálogo está em [componentes.md](componentes.md), e as composições em
[padroes-de-pagina.md](padroes-de-pagina.md).

## 9. Responsividade

A implementação é mobile first e deve ser verificada em 360, 390, 768, 1024,
1366, 1440 e 1920 px. Tablet é uma faixa deliberada, não apenas desktop reduzido.

- nenhuma função autorizada desaparece por viewport;
- nenhuma barra fixa encobre conteúdo;
- formulários mobile usam uma coluna;
- tabelas viram cartões quando a comparação tabular não for essencial;
- rolagem horizontal é reservada a comparações técnicas reais;
- ações de campo possuem alvo mínimo de 44 px, preferencialmente 48 px;
- nenhuma interação depende exclusivamente de hover.

Detalhes estão em [responsividade.md](responsividade.md).

## 10. Estados e comandos de negócio

Toda tela relevante trata:

- carregamento inicial e atualização em segundo plano;
- vazio natural e vazio por filtros;
- erro recuperável;
- validação;
- ausência de permissão;
- sessão expirada;
- conflito de edição;
- sucesso;
- conteúdo arquivado;
- conexão degradada, quando aplicável.

Comandos de negócio devem apresentar pré-condições, bloqueios, confirmação de
impacto, processamento, resultado e próximo passo. Duplo envio é impedido na UI
e na API. Consulte [estados-e-interacoes.md](estados-e-interacoes.md).

## 11. Acessibilidade

A meta é WCAG 2.2 AA:

- HTML semântico e landmarks;
- foco visível;
- navegação por teclado;
- contraste AA;
- labels e mensagens associadas aos campos;
- modais com gerenciamento de foco;
- ícones com nome acessível;
- gráficos acompanhados por valores ou tabela equivalente;
- zoom de 200% sem perda funcional;
- respeito a `prefers-reduced-motion`.

Consulte [acessibilidade.md](acessibilidade.md).

## 12. Relação com o Figma Make

O pacote Figma v1 é referência visual aprovada para shell, dashboard, funil,
clientes, propostas, projetos, financeiro, estoque e configurações. Telas marcadas
como placeholder não são consideradas especificadas visualmente.

Não copiar para produção:

- mocks e dados estáticos;
- navegação controlada apenas por estado local;
- estilos inline repetidos;
- cores literais espalhadas;
- breakpoints binários mobile/desktop;
- componentes sem autorização ou integração com API;
- ações que alteram apenas o estado visual.

Consulte [mapeamento-figma-aplicacao.md](mapeamento-figma-aplicacao.md).

## 13. Critérios de aceite

- [ ] Tokens consumidos pelo frontend sem cores literais de produto.
- [ ] Rotas reais e compartilháveis.
- [ ] Navegação completa em mobile, tablet e desktop.
- [ ] Permissões aplicadas no menu e obrigatoriamente na API.
- [ ] Componentes reutilizáveis documentados e testados.
- [ ] Estados de loading, vazio, erro, conflito e acesso negado.
- [ ] Fluxos M1–M6 continuam funcionais após a migração.
- [ ] Sem overflow acidental nos viewports suportados.
- [ ] Teclado, toque, zoom e contraste validados.
- [ ] Screenshots de regressão aprovadas.
- [ ] Nenhuma regra de negócio migrada para componentes visuais.
- [ ] Figma usado como referência visual, não como fonte de dados.

## 14. Documentos complementares

- [mapa-navegacao.md](mapa-navegacao.md)
- [tokens-visuais.md](tokens-visuais.md)
- [componentes.md](componentes.md)
- [padroes-de-pagina.md](padroes-de-pagina.md)
- [responsividade.md](responsividade.md)
- [inventario-de-telas.md](inventario-de-telas.md)
- [estados-e-interacoes.md](estados-e-interacoes.md)
- [acessibilidade.md](acessibilidade.md)
- [mapeamento-figma-aplicacao.md](mapeamento-figma-aplicacao.md)
- [plano-migracao.md](plano-migracao.md)

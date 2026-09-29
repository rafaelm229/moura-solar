# SPEC-003 — Design system, arquitetura de informação e responsividade

**Status:** Proposta para validação visual  
**Versão:** 0.1.0  
**Escopo:** aplicação web responsiva

## 1. Objetivo

Definir uma linguagem visual e organizacional única para a Moura Solar Platform,
garantindo que os módulos formem um mesmo produto e funcionem com qualidade em
celular, tablet, notebook e desktop.

Esta SPEC não determina permissões pelo dispositivo. Ela determina como a mesma
capacidade autorizada será apresentada em diferentes espaços e formas de entrada.

## 2. Princípios de experiência

1. **Processo antes do módulo:** a interface mostra contexto, etapa atual, bloqueios
   e próxima ação.
2. **Progressão explícita:** comandos de negócio são diferentes de edição comum.
3. **Uma fonte de verdade:** estados visuais refletem dados confirmados pela API.
4. **Densidade adaptativa:** desktop aproveita espaço; celular prioriza decisão e
   execução sem remover capacidades.
5. **Consistência operacional:** mesma ação usa nome, cor, ícone e consequência
   equivalentes em toda a plataforma.
6. **Segurança perceptível:** ações destrutivas ou irreversíveis mostram alvo e
   efeito antes da confirmação.
7. **Acessibilidade por padrão:** contraste, foco, rótulos e navegação por teclado
   fazem parte do componente, não de correção posterior.
8. **Velocidade percebida:** carregamento parcial, skeletons moderados e feedback
   imediato evitam telas aparentemente travadas.

## 3. Arquitetura de informação

### 3.1 Áreas principais

```text
Visão geral
Comercial
  ├── Funil
  ├── Clientes
  ├── Oportunidades
  ├── Atividades
  └── Propostas
Operação
  ├── Projetos
  ├── Engenharia
  ├── Agenda
  ├── Instalações
  └── Pós-venda
Suprimentos
  ├── Estoque
  ├── Movimentações
  ├── Compras
  ├── Fornecedores
  └── Inventários
Financeiro
  ├── Visão financeira
  ├── Contas a receber
  ├── Contas a pagar
  ├── Comissões
  └── Fluxo de caixa
Administração
  ├── Equipe
  ├── Papéis e permissões
  ├── Auditoria
  ├── Cadastros auxiliares
  └── Configurações
```

Itens sem permissão não aparecem no menu e permanecem protegidos na API. O menu
não muda porque o usuário abriu a plataforma em outro tamanho de tela.

### 3.2 Navegação contextual

Entidades complexas usam uma página de detalhe com cabeçalho persistente e abas
contextuais, evitando duplicar o mesmo projeto em vários módulos.

Exemplo de projeto:

```text
Resumo | Comercial | Contrato | Financeiro | Engenharia |
Materiais | Instalação | Documentos | Histórico
```

A aba ativa pode variar conforme perfil, mas todas as abas autorizadas continuam
acessíveis. No celular, as abas usam seletor/rolagem horizontal sem perder rotas.

### 3.3 Busca global

A busca localiza, conforme permissão:

- clientes;
- oportunidades;
- propostas;
- contratos;
- projetos;
- instalações;
- produtos e documentos.

Resultados informam tipo, identificador, estado e contexto. A busca não expõe
conteúdo de entidades sem permissão.

## 4. Estrutura responsiva da aplicação

### 4.1 Celular — 360 a 767 px

- Cabeçalho compacto com título, retorno e ações contextuais.
- Navegação inferior com até quatro destinos prioritários e item `Mais`.
- `Mais` abre todas as áreas autorizadas, agrupadas como no desktop.
- Conteúdo em uma coluna.
- Ações primárias podem usar barra inferior, mas ela deve reservar espaço no
  conteúdo e nunca encobrir informações.
- Tabelas viram cartões, listas ou visualização mestre-detalhe conforme a tarefa.
- Filtros abrem em painel de tela cheia ou bottom sheet com resumo dos ativos.
- Formulários longos usam seções ou etapas; valores preenchidos são preservados.

### 4.2 Tablet — 768 a 1023 px

- Menu lateral recolhível ou drawer persistente em orientação paisagem.
- Uma ou duas colunas conforme a tarefa.
- Listas podem usar mestre-detalhe quando isso reduz trocas de tela.
- Ações de campo mantêm alvos de toque adequados.
- Nenhuma interação depende de hover.

### 4.3 Notebook — 1024 a 1439 px

- Menu lateral compacto/recolhível.
- Cabeçalho com busca, contexto e ações globais.
- Grade entre 8 e 12 colunas conforme largura útil.
- Tabelas priorizam colunas essenciais e permitem configurar/exibir detalhes.
- Painéis laterais são aceitos para edição curta e contexto secundário.

### 4.4 Desktop — 1440 px ou mais

- Menu lateral persistente com opção de recolher.
- Largura de conteúdo controlada para formulários; dashboards podem usar toda a
  área útil com limites de legibilidade.
- Densidade maior sem reduzir alvos de interação.
- Comparações, tabelas e painéis podem ocupar múltiplas colunas.

## 5. Navegação por perfil

Perfil define atalhos e página inicial, não capacidade exclusiva.

| Perfil        | Página inicial recomendada | Atalhos principais                                |
| ------------- | -------------------------- | ------------------------------------------------- |
| Administrador | Saúde da operação          | usuários, auditoria, configurações                |
| Gerente       | Painel integrado           | funil, projetos, pendências, indicadores          |
| Vendedor      | Trabalho comercial         | atividades, clientes, oportunidades, propostas    |
| Financeiro    | Painel financeiro          | receber, pagar, atrasos, fluxo                    |
| Estoquista    | Operação de estoque        | separações, entradas, transferências, inventários |
| Instalador    | Agenda de campo            | hoje, ordens, materiais, pendências               |
| Engenharia    | Fila técnica               | levantamentos, dimensionamentos, homologações     |

O usuário poderá abrir outras áreas autorizadas pelo menu completo.

## 6. Design tokens

Tokens serão mantidos em `packages/design-tokens` e consumidos pelas interfaces.
Valores não devem ser espalhados como números ou cores literais nos módulos.

### 6.1 Cores semânticas iniciais

| Token                 | Uso                        | Valor inicial |
| --------------------- | -------------------------- | ------------: |
| `brand.primary`       | marca, ação principal      |     `#087443` |
| `brand.primaryStrong` | hover/ênfase               |     `#045C34` |
| `brand.primarySoft`   | fundos selecionados        |     `#E2F3E9` |
| `brand.accent`        | energia/destaques pontuais |     `#F59E0B` |
| `surface.canvas`      | fundo da aplicação         |     `#F4F7F5` |
| `surface.default`     | cartões e painéis          |     `#FFFFFF` |
| `text.primary`        | texto principal            |     `#102A23` |
| `text.secondary`      | texto secundário           |     `#64736E` |
| `border.default`      | divisores e bordas         |     `#D9E2DE` |
| `status.info`         | informação                 |     `#2563EB` |
| `status.success`      | confirmação                |     `#15803D` |
| `status.warning`      | atenção                    |     `#D97706` |
| `status.danger`       | erro/destrutivo            |     `#DC2626` |

Cor nunca será a única forma de comunicar estado. Badges combinam texto, cor e,
quando útil, ícone.

### 6.2 Tipografia

- Família inicial: `Inter`, com fallback de sistema.
- Base: 16 px em formulários; texto auxiliar nunca inferior a 12 px.
- Escala: 12, 14, 16, 18, 20, 24, 30 e 36 px.
- Títulos usam peso e espaço, não letras excessivamente grandes.
- Valores financeiros e métricas usam numerais tabulares quando disponíveis.

### 6.3 Espaçamento e forma

- Unidade base: 4 px.
- Escala: 4, 8, 12, 16, 20, 24, 32, 40 e 48 px.
- Raio padrão: 10 px; campos e botões respeitam a mesma família visual.
- Sombras são discretas e não substituem bordas/estrutura.
- Altura mínima de alvo por toque: 44 px; preferencialmente 48 px em campo.

## 7. Componentes obrigatórios

### Fundação

- Button, IconButton, Link e ButtonGroup.
- Input, Textarea, Select, Combobox, Checkbox, Radio, Switch e DatePicker.
- FormField com label, ajuda, erro e estado obrigatório.
- Badge, Avatar, Tooltip, Separator e Skeleton.
- Card, Alert, Toast, Dialog, Drawer e BottomSheet.

### Navegação

- AppShell, Sidebar, MobileNavigation, Breadcrumbs.
- PageHeader, ContextTabs, CommandMenu e GlobalSearch.
- Pagination e Stepper.

### Dados e operação

- DataTable responsiva.
- MobileCardList.
- FilterBar e ActiveFilters.
- EmptyState, ErrorState, PermissionState e OfflineState.
- Timeline/AuditTrail.
- MetricCard e StatusSummary.
- FileUploader, DocumentViewer e CameraCapture.
- Checklist, SignaturePad e SerialNumberInput.

Cada componente documentará variantes, estados, acessibilidade e comportamento
por faixa de tela. Módulos não recriarão versões locais sem justificar no ADR.

## 8. Padrões de página

### 8.1 Listagem

Contém título, resumo, busca, filtros, ação primária, resultado e paginação. No
celular, filtros ativos permanecem visíveis e registros viram cartões quando a
comparação tabular não for indispensável.

### 8.2 Detalhe

Contém identidade, estado, responsável, próxima ação, bloqueios, abas e histórico.
A primeira dobra deve responder: “o que é, em que estado está e o que fazer agora?”.

### 8.3 Formulário

Campos são agrupados por intenção. Ações permanecem previsíveis: cancelar à
esquerda/segundo plano e salvar/avançar em destaque. Fechar com alterações mostra
aviso. Erros levam foco ao primeiro campo inválido e exibem resumo quando longo.

### 8.4 Fluxo por etapas

Usado apenas quando a ordem importa. O stepper não substitui salvamento parcial.
Etapas concluídas podem ser revisitadas conforme regra de negócio.

### 8.5 Painel operacional

Prioriza exceções e ações, não apenas números. Métricas devem possuir origem,
período e destino ao clicar. Gráficos não substituem listas de pendências.

## 9. Estados de interação

Toda tela relevante deve tratar:

- carregamento inicial;
- atualização em segundo plano;
- vazio sem filtros;
- vazio causado por filtros;
- erro recuperável;
- erro de validação;
- acesso negado;
- sessão expirada confirmada;
- sucesso;
- conflito de edição;
- conteúdo arquivado;
- conexão degradada quando aplicável.

Falha de rede não deve ser apresentada como credencial inválida.

## 10. Comandos de negócio

Ações como `Enviar proposta`, `Aprovar`, `Reservar materiais`, `Iniciar instalação`
e `Concluir instalação` não são simples edições. Elas devem:

1. informar pré-condições e bloqueios;
2. confirmar impactos relevantes;
3. impedir duplo envio;
4. mostrar processamento;
5. apresentar resultado e próximo passo;
6. atualizar todas as visões dependentes;
7. permitir rastrear a operação no histórico.

## 11. Regras para tabelas

- Cabeçalho claro e alinhamento consistente.
- Valores monetários e quantidades alinhados à direita.
- Ações da linha em menu nomeado, sem depender apenas de reticências invisíveis.
- Seleção em massa somente quando houver comando em lote válido.
- Colunas podem ser ocultadas no celular, mas seus dados continuam no cartão/detalhe.
- Rolagem horizontal é último recurso para comparação técnica real.
- Cabeçalho fixo não pode encobrir conteúdo nem conflitar com o AppShell.

## 12. Formulários em campo

Para instaladores e estoquistas:

- botões e campos com 48 px quando possível;
- suporte a câmera diretamente no campo de evidência;
- autosave de rascunho onde houver risco de perda;
- progresso claro do checklist;
- confirmação visual após leitura de serial/QR;
- ação primária próxima ao polegar sem encobrir o último item;
- nenhuma dependência de hover ou clique com precisão fina.

## 13. Acessibilidade

- HTML semântico e landmarks.
- Ordem de foco equivalente à ordem visual.
- Foco visível.
- Rótulo acessível para ícones.
- Contraste mínimo WCAG AA para texto e controles essenciais.
- Erros anunciados e associados aos campos.
- Diálogos prendem foco e retornam ao acionador.
- Zoom de 200% não remove funcionalidade.
- Animação respeita preferência de movimento reduzido.

## 14. Testes visuais e responsivos

Cada página nova terá cenários automatizados ou evidências equivalentes em:

- 360 × 800;
- 390 × 844;
- 768 × 1024;
- 1024 × 768;
- 1366 × 768;
- 1440 × 900.

Fluxos críticos serão testados com teclado e viewport móvel. Screenshots de
regressão focarão AppShell, navegação, listagens, detalhes, formulários e modais.

## 15. Critérios de aceitação

- [ ] Arquitetura das áreas e menus aprovada.
- [ ] Navegação completa permanece disponível em qualquer dispositivo autorizado.
- [ ] Tokens visuais iniciais aprovados.
- [ ] Padrões de listagem, detalhe, formulário e painel aprovados.
- [ ] Componentes obrigatórios priorizados.
- [ ] Fluxo do instalador validado na web móvel.
- [ ] Critérios de acessibilidade e responsividade aceitos.
- [ ] Nenhum elemento fixo cobre o conteúdo em viewports suportados.

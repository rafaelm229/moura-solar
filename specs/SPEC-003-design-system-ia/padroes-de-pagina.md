# Padrões de página

## 1. Shell

O shell contém navegação, contexto, busca e área principal. Ele não carrega toda a
aplicação em um único componente. Cada rota possui boundary de loading e erro.

## 2. Dashboard

Ordem recomendada:

1. período e contexto;
2. alertas e bloqueios;
3. métricas principais;
4. tendências e gráficos;
5. pendências acionáveis;
6. atividade recente.

Métrica informa período, unidade, origem e destino ao clicar. Gráfico nunca substitui
a lista de exceções ou uma alternativa textual.

## 3. Listagem

Inclui título, descrição curta, ação primária, busca, filtros, filtros ativos,
resultados e paginação. Desktop usa tabela quando comparação entre colunas é útil;
mobile usa cartões com as mesmas informações e ações autorizadas.

## 4. Detalhe

A primeira dobra responde:

- o que é;
- em que estado está;
- quem é responsável;
- qual é a próxima ação;
- quais bloqueios existem;
- qual é o prazo.

Informações complementares aparecem em abas contextuais e histórico.

## 5. Formulário

- campos agrupados por intenção;
- uma coluna no mobile;
- uma ou duas colunas no tablet/desktop quando relações forem claras;
- ação primária previsível;
- aviso ao sair com alteração não salva;
- foco no primeiro erro;
- rascunho somente quando suportado pelo domínio/API.

## 6. Fluxo por etapas

Usado quando existe ordem operacional real. Stepper não cria estados paralelos e
não substitui salvamento. Etapas anteriores podem ser revisitadas conforme o domínio.

## 7. Kanban comercial

O Kanban representa estados reais da oportunidade. Arrastar não altera a etapa sem
executar o comando de domínio e validar gates. Deve existir visualização em lista,
especialmente no mobile e para acessibilidade por teclado.

## 8. Painel lateral

Drawer é usado para consulta ou edição curta sem perder a lista. Entidades complexas
abrem rota de detalhe. O estado selecionado deve ser restaurável por URL quando relevante.

## 9. Operação em campo

- cabeçalho compacto;
- progresso do checklist;
- ação principal ao alcance sem encobrir itens;
- câmera integrada;
- confirmação após serial/QR;
- retomada segura após falha de rede;
- indicador claro do que foi efetivamente sincronizado.

## 10. Documentos

Listas de documentos mostram tipo, versão, status, hash/identidade quando relevante,
autor, data e ações. Upload diferencia envio, processamento, confirmação e falha.

